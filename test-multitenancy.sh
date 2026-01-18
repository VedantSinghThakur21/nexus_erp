#!/bin/bash
# Test Frappe multi-tenant routing with Host header

SITE="vfixit.avariq.in"
MASTER_URL="http://127.0.0.1:8080"

echo "=== Testing Frappe Multi-Tenant Routing ==="
echo ""

# Test 1: Login with Host header
echo "1. Testing login with Host header..."
LOGIN_RESPONSE=$(curl -s -i -X POST "${MASTER_URL}/api/method/login" \
  -H "Host: ${SITE}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "usr=thakurvedant21@gmail.com&pwd=YOUR_PASSWORD")

echo "Response:"
echo "$LOGIN_RESPONSE" | head -20
echo ""

# Extract session cookie
SID=$(echo "$LOGIN_RESPONSE" | grep -oP 'sid=\K[^;]+' | head -1)
echo "Session ID: ${SID:0:20}..."
echo ""

# Test 2: API call with session cookie + Host header
echo "2. Testing API call with session cookie + Host header..."
API_RESPONSE=$(curl -s -X GET "${MASTER_URL}/api/method/frappe.client.get_count" \
  -H "Host: ${SITE}" \
  -H "Cookie: sid=${SID}" \
  -H "Content-Type: application/json" \
  --data '{"doctype":"Tenant"}')

echo "Tenant count response:"
echo "$API_RESPONSE"
echo ""

# Test 3: Check which database we're on
echo "3. Checking current site..."
SITE_CHECK=$(curl -s -X GET "${MASTER_URL}/api/method/frappe.auth.get_logged_user" \
  -H "Host: ${SITE}" \
  -H "Cookie: sid=${SID}")

echo "Logged user response:"
echo "$SITE_CHECK"
echo ""

echo "=== Expected Results ==="
echo "- Login: Should return JSON with 'Logged In' message"
echo "- Tenant count: Should be 0 (tenant DB) not 25 (master DB)"
echo "- Logged user: Should be tenant user email"
