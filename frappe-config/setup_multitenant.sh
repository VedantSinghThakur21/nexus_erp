#!/bin/bash

###############################################################################
# Frappe Multi-Tenant Setup Script
# Creates multiple Frappe sites with DNS-based routing
###############################################################################

set -e  # Exit on error

# ============================================================================
# CONFIGURATION
# ============================================================================

BENCH_PATH="$HOME/frappe-bench"
MARIADB_ROOT_PWD="vedant@21"  # CHANGE THIS!
ADMIN_PWD="vedant@21"                         # CHANGE THIS!
DOMAIN="localhost"                           # Change to your domain
TENANTS=("tenant1" "tenant2" "tenant3")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# FUNCTIONS
# ============================================================================

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                            ║${NC}"
    echo -e "${BLUE}║     Frappe Multi-Tenant Setup Script                      ║${NC}"
    echo -e "${BLUE}║     DNS-Based Multi-Tenancy Configuration                 ║${NC}"
    echo -e "${BLUE}║                                                            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}➜${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    if [ ! -d "$BENCH_PATH" ]; then
        print_error "Bench not found at $BENCH_PATH"
        echo "Please install bench first:"
        echo "  pip3 install frappe-bench"
        echo "  bench init frappe-bench"
        exit 1
    fi
    
    if ! command -v mysql &> /dev/null; then
        print_error "MySQL/MariaDB not found"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

enable_dns_multitenant() {
    print_step "Enabling DNS multitenant mode..."
    
    cd "$BENCH_PATH" || exit 1
    bench config dns_multitenant on
    bench config serve_default_site false
    
    print_success "DNS multitenant enabled"
}

create_site() {
    local site_name=$1
    print_step "Creating site: $site_name"
    
    if [ -d "$BENCH_PATH/sites/$site_name" ]; then
        print_error "Site $site_name already exists, skipping..."
        return 0
    fi
    
    cd "$BENCH_PATH" || exit 1
    
    bench new-site "$site_name" \
        --mariadb-root-password "$MARIADB_ROOT_PWD" \
        --admin-password "$ADMIN_PWD" \
        --no-mariadb-socket \
        --verbose
    
    if [ $? -eq 0 ]; then
        print_success "Site $site_name created successfully"
    else
        print_error "Failed to create site $site_name"
        return 1
    fi
}

install_erpnext() {
    local site_name=$1
    print_step "Installing ERPNext on $site_name..."
    
    cd "$BENCH_PATH" || exit 1
    
    # Check if ERPNext is already available
    if [ ! -d "$BENCH_PATH/apps/erpnext" ]; then
        print_step "Getting ERPNext app..."
        bench get-app erpnext --branch version-15
    fi
    
    # Install on site
    bench --site "$site_name" install-app erpnext
    
    print_success "ERPNext installed on $site_name"
}

setup_production() {
    print_step "Setting up production environment..."
    
    cd "$BENCH_PATH" || exit 1
    
    # Setup Nginx
    sudo bench setup nginx
    
    # Setup Supervisor
    sudo bench setup supervisor
    
    # Enable and start services
    sudo supervisorctl reread
    sudo supervisorctl update
    sudo supervisorctl start all
    
    # Reload Nginx
    sudo service nginx reload
    
    print_success "Production environment configured"
}

generate_hosts_entries() {
    print_step "Generating hosts file entries..."
    
    echo ""
    echo "Add these entries to your hosts file:"
    echo ""
    
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        echo "Windows: C:\\Windows\\System32\\drivers\\etc\\hosts"
    else
        echo "Linux/Mac: /etc/hosts"
    fi
    
    echo ""
    echo "127.0.0.1 $DOMAIN"
    
    for tenant in "${TENANTS[@]}"; do
        echo "127.0.0.1 ${tenant}.${DOMAIN}"
        echo "127.0.0.1 api.${tenant}.${DOMAIN}"
    done
    
    echo ""
}

verify_sites() {
    print_step "Verifying sites..."
    
    cd "$BENCH_PATH" || exit 1
    
    echo ""
    echo "Available sites:"
    ls -1 sites/ | grep -v "^assets$" | grep -v "^common_site_config.json$" | grep -v "^currentsite.txt$"
    echo ""
    
    echo "Databases:"
    mysql -u root -p"$MARIADB_ROOT_PWD" -e "SHOW DATABASES LIKE '%${DOMAIN//./_}%';" 2>/dev/null || true
    echo ""
}

test_sites() {
    print_step "Testing site connectivity..."
    
    echo ""
    for tenant in "${TENANTS[@]}"; do
        site_name="${tenant}.${DOMAIN}"
        echo -n "Testing $site_name... "
        
        response=$(curl -s -o /dev/null -w "%{http_code}" "http://$site_name:8000/api/method/ping" || echo "000")
        
        if [ "$response" == "200" ]; then
            print_success "OK (HTTP $response)"
        else
            print_error "Failed (HTTP $response)"
        fi
    done
    echo ""
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}║     Multi-Tenant Setup Complete!                          ║${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "📋 Access your sites:"
    echo ""
    for tenant in "${TENANTS[@]}"; do
        echo "  • http://${tenant}.${DOMAIN}:8000"
    done
    echo ""
    echo "🔐 Login Credentials:"
    echo "  Username: Administrator"
    echo "  Password: $ADMIN_PWD"
    echo ""
    echo "📝 Site Configuration:"
    echo "  Location: $BENCH_PATH/sites/common_site_config.json"
    echo "  DNS Multitenant: Enabled"
    echo ""
    echo "🔍 Verify with:"
    echo "  curl http://tenant1.${DOMAIN}:8000/api/method/ping"
    echo ""
    echo "📚 Documentation:"
    echo "  See FRAPPE_MULTITENANCY_GUIDE.md for complete guide"
    echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    print_header
    
    # Validate configuration
    if [ "$MARIADB_ROOT_PWD" == "your_root_password_here" ]; then
        print_error "Please configure MARIADB_ROOT_PWD in the script"
        exit 1
    fi
    
    # Run setup steps
    check_prerequisites
    enable_dns_multitenant
    
    # Create main tenant sites
    for tenant in "${TENANTS[@]}"; do
        create_site "${tenant}.${DOMAIN}"
    done
    
    # Create API subdomain sites
    for tenant in "${TENANTS[@]}"; do
        create_site "api.${tenant}.${DOMAIN}"
    done
    
    # Optional: Install ERPNext
    read -p "Do you want to install ERPNext on all sites? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for tenant in "${TENANTS[@]}"; do
            install_erpnext "${tenant}.${DOMAIN}"
        done
    fi
    
    # Setup production
    read -p "Do you want to setup production (Nginx + Supervisor)? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_production
    fi
    
    # Generate hosts entries
    generate_hosts_entries
    
    # Verify and test
    verify_sites
    
    # Test connectivity (only if production is setup)
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sleep 2
        test_sites
    fi
    
    # Print summary
    print_summary
}

# Run main function
main "$@"
