#!/usr/bin/env bash
# Integration smoke test: provisioning key mint → tenant-site verify → sample API call.
#
# Usage:
#   ./scripts/test-login-flow.sh <subdomain> <user_email>
#
# Environment (or pass inline):
#   PROVISIONING_SERVICE_URL  default http://127.0.0.1:8002
#   PROVISIONING_API_SECRET   required
#   ERP_NEXT_URL              default http://127.0.0.1:8080
#   NEXT_PUBLIC_ROOT_DOMAIN   default avariq.in
#
# Example:
#   PROVISIONING_API_SECRET=change-me-in-production \
#     ./scripts/test-login-flow.sh testorg thakurvedant21@gmail.com

set -euo pipefail

SUBDOMAIN="${1:-}"
USER_EMAIL="${2:-}"
PROVISIONING_URL="${PROVISIONING_SERVICE_URL:-http://127.0.0.1:8002}"
PROVISIONING_SECRET="${PROVISIONING_API_SECRET:-}"
ERP_URL="${ERP_NEXT_URL:-http://127.0.0.1:8080}"
ROOT_DOMAIN="${NEXT_PUBLIC_ROOT_DOMAIN:-avariq.in}"

if [[ -z "$SUBDOMAIN" || -z "$USER_EMAIL" ]]; then
  echo "Usage: $0 <subdomain> <user_email>"
  exit 1
fi

if [[ -z "$PROVISIONING_SECRET" ]]; then
  echo "FAIL: PROVISIONING_API_SECRET is not set"
  exit 1
fi

SITE_NAME="${SUBDOMAIN}.${ROOT_DOMAIN}"

fail() {
  echo "FAIL: $1"
  exit 1
}

pass() {
  echo "PASS: $1"
}

echo "=== Login flow integration test ==="
echo "  tenant:  ${SITE_NAME}"
echo "  user:    ${USER_EMAIL}"
echo "  prov:    ${PROVISIONING_URL}"
echo "  frappe:  ${ERP_URL}"
echo ""

# 1. Mint keys via provisioning service
MINT_JSON=$(curl -sf -X POST "${PROVISIONING_URL}/api/v1/generate-user-keys/${SUBDOMAIN}" \
  -H "Content-Type: application/json" \
  -H "X-Provisioning-Secret: ${PROVISIONING_SECRET}" \
  -d "{\"user_email\":\"${USER_EMAIL}\"}") || fail "provisioning /generate-user-keys unreachable"

API_KEY=$(echo "$MINT_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('api_key',''))" 2>/dev/null || true)
API_SECRET=$(echo "$MINT_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('api_secret',''))" 2>/dev/null || true)

if [[ -z "$API_KEY" || -z "$API_SECRET" ]]; then
  echo "Mint response: $MINT_JSON"
  fail "provisioning did not return api_key/api_secret"
fi
pass "provisioning returned keys"

# 2. Verify keys against tenant site (Host header routing)
WHOAMI=$(curl -sf -H "Host: ${SITE_NAME}" \
  -H "Authorization: token ${API_KEY}:${API_SECRET}" \
  "${ERP_URL}/api/method/frappe.auth.get_logged_user") || fail "get_logged_user request failed"

LOGGED_USER=$(echo "$WHOAMI" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))" 2>/dev/null || true)

if [[ "$LOGGED_USER" != "$USER_EMAIL" ]]; then
  echo "get_logged_user response: $WHOAMI"
  fail "expected message=${USER_EMAIL}, got message=${LOGGED_USER:-<empty>}"
fi
pass "token auth on ${SITE_NAME} returned ${LOGGED_USER}"

# 3. Sample tenant API call (Quotation list)
QUOTATIONS=$(curl -sf -H "Host: ${SITE_NAME}" \
  -H "Authorization: token ${API_KEY}:${API_SECRET}" \
  "${ERP_URL}/api/method/frappe.client.get_list?doctype=Quotation&fields=%5B%22name%22%5D&limit_page_length=1") || fail "frappe.client.get_list Quotation failed"

echo "Quotation list sample: $(echo "$QUOTATIONS" | head -c 200)"
pass "Quotation get_list succeeded on ${SITE_NAME}"

echo ""
echo "=== ALL CHECKS PASSED ==="
