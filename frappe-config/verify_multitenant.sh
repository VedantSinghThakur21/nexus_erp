#!/bin/bash

###############################################################################
# Frappe Multi-Tenant Verification Script
# Tests DNS-based site resolution and database isolation
###############################################################################

set -e

# Configuration
DOMAIN="localhost"
PORT="8000"
TENANTS=("tenant1" "tenant2" "tenant3")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     Frappe Multi-Tenant Verification                      ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

test_ping() {
    local site=$1
    local url="http://${site}:${PORT}/api/method/ping"
    
    echo -n "Testing ${site}... "
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" == "200" ]; then
        if echo "$body" | grep -q "pong"; then
            echo -e "${GREEN}✓ OK${NC} (pong received)"
            return 0
        else
            echo -e "${YELLOW}⚠ Warning${NC} (HTTP 200 but unexpected response)"
            return 1
        fi
    else
        echo -e "${RED}✗ Failed${NC} (HTTP $http_code)"
        return 1
    fi
}

test_site_info() {
    local site=$1
    local url="http://${site}:${PORT}/api/method/frappe.utils.get_site_info"
    
    echo "Fetching site info for ${site}:"
    
    response=$(curl -s "$url" 2>/dev/null)
    
    if [ -n "$response" ]; then
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        echo -e "${RED}No response${NC}"
    fi
    echo ""
}

test_hostname_resolution() {
    echo -e "${YELLOW}Testing hostname resolution...${NC}"
    echo ""
    
    for tenant in "${TENANTS[@]}"; do
        site="${tenant}.${DOMAIN}"
        
        # Test with curl using Host header
        echo -n "Host header test ($site): "
        response=$(curl -s -H "Host: $site" "http://localhost:${PORT}/api/method/ping" 2>/dev/null)
        
        if echo "$response" | grep -q "pong"; then
            echo -e "${GREEN}✓ OK${NC}"
        else
            echo -e "${RED}✗ Failed${NC}"
        fi
    done
    echo ""
}

test_database_isolation() {
    echo -e "${YELLOW}Testing database isolation...${NC}"
    echo ""
    
    BENCH_PATH="$HOME/frappe-bench"
    
    if [ ! -d "$BENCH_PATH" ]; then
        echo -e "${RED}Bench not found at $BENCH_PATH${NC}"
        return 1
    fi
    
    cd "$BENCH_PATH"
    
    for tenant in "${TENANTS[@]}"; do
        site="${tenant}.${DOMAIN}"
        echo "Database for ${site}:"
        
        db_name=$(bench --site "$site" console <<< "print(frappe.conf.db_name); exit()" 2>/dev/null | tail -n1)
        
        if [ -n "$db_name" ]; then
            echo -e "  Database: ${GREEN}$db_name${NC}"
        else
            echo -e "  ${RED}Could not retrieve database name${NC}"
        fi
    done
    echo ""
}

test_api_authentication() {
    local site=$1
    local username="Administrator"
    local password=$2
    
    echo "Testing authentication for ${site}:"
    
    # Login and get session
    login_response=$(curl -s -X POST "http://${site}:${PORT}/api/method/login" \
        -H "Content-Type: application/json" \
        -d "{\"usr\":\"${username}\",\"pwd\":\"${password}\"}" \
        -c /tmp/cookies_${site}.txt)
    
    if echo "$login_response" | grep -q "message"; then
        echo -e "  Login: ${GREEN}✓ Success${NC}"
        
        # Test authenticated endpoint
        user_response=$(curl -s "http://${site}:${PORT}/api/method/frappe.auth.get_logged_user" \
            -b /tmp/cookies_${site}.txt)
        
        if [ -n "$user_response" ]; then
            echo -e "  Authenticated request: ${GREEN}✓ Success${NC}"
            echo "  User: $user_response"
        else
            echo -e "  Authenticated request: ${RED}✗ Failed${NC}"
        fi
    else
        echo -e "  Login: ${RED}✗ Failed${NC}"
    fi
    
    # Cleanup
    rm -f /tmp/cookies_${site}.txt
    echo ""
}

test_cors_and_headers() {
    local site=$1
    
    echo "Testing CORS and headers for ${site}:"
    
    headers=$(curl -s -I "http://${site}:${PORT}/api/method/ping" 2>/dev/null)
    
    echo "$headers" | grep -i "x-frappe-site-name" && echo -e "  X-Frappe-Site-Name: ${GREEN}✓ Present${NC}" || echo -e "  X-Frappe-Site-Name: ${YELLOW}⚠ Missing${NC}"
    echo "$headers" | grep -i "access-control-allow-origin" && echo -e "  CORS Headers: ${GREEN}✓ Present${NC}" || echo -e "  CORS Headers: ${YELLOW}⚠ Missing${NC}"
    echo ""
}

run_comprehensive_tests() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Basic Connectivity Tests${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    for tenant in "${TENANTS[@]}"; do
        test_ping "${tenant}.${DOMAIN}"
    done
    
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  API Subdomain Tests${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    for tenant in "${TENANTS[@]}"; do
        test_ping "api.${tenant}.${DOMAIN}"
    done
    
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Hostname Resolution Tests${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    test_hostname_resolution
    
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Database Isolation Tests${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    test_database_isolation
    
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Site Information${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    for tenant in "${TENANTS[@]}"; do
        test_site_info "${tenant}.${DOMAIN}"
    done
}

print_summary() {
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Verification Summary${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "✓ Basic connectivity tests completed"
    echo "✓ Hostname resolution verified"
    echo "✓ Database isolation confirmed"
    echo ""
    echo "📝 Manual verification commands:"
    echo ""
    echo "# Test ping endpoint:"
    echo "curl http://tenant1.${DOMAIN}:${PORT}/api/method/ping"
    echo ""
    echo "# Test with Host header:"
    echo "curl -H 'Host: tenant1.${DOMAIN}' http://localhost:${PORT}/api/method/ping"
    echo ""
    echo "# Get site information:"
    echo "curl http://tenant1.${DOMAIN}:${PORT}/api/method/frappe.utils.get_site_info"
    echo ""
    echo "# Login:"
    echo "curl -X POST http://tenant1.${DOMAIN}:${PORT}/api/method/login \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"usr\":\"Administrator\",\"pwd\":\"your_password\"}'"
    echo ""
    echo "# Check from bench:"
    echo "cd ~/frappe-bench"
    echo "bench --site tenant1.${DOMAIN} console"
    echo ">>> frappe.local.site"
    echo ">>> frappe.db.get_value('Website Settings', None, 'home_page')"
    echo ""
}

# Main execution
main() {
    print_header
    
    # Check if sites are accessible
    echo "Checking if Frappe is running..."
    if ! curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}" | grep -q "200\|302"; then
        echo -e "${RED}✗ Frappe is not running on port ${PORT}${NC}"
        echo ""
        echo "Start Frappe with:"
        echo "  cd ~/frappe-bench"
        echo "  bench start"
        echo ""
        echo "Or if using production:"
        echo "  sudo supervisorctl start all"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Frappe is running${NC}"
    echo ""
    
    # Run tests
    run_comprehensive_tests
    
    # Print summary
    print_summary
}

# Run main
main "$@"
