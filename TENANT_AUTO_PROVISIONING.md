# Automatic Tenant Provisioning System

Complete guide for automatically provisioning new tenants with dynamic Frappe backend site creation.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     TENANT PROVISIONING FLOW                     │
└─────────────────────────────────────────────────────────────────┘

1. User Registration
   ├─ User submits: tenant_name, email, plan
   └─ Next.js API validates availability

2. Provisioning API Triggered
   ├─ POST /api/admin/provision-tenant
   ├─ Validates tenant name (DNS-safe)
   ├─ Checks subdomain availability
   └─ Queues provisioning job

3. Backend Site Creation
   ├─ SSH to Frappe server
   ├─ Run: bench new-site api.{tenant}.localhost
   ├─ Install apps (erpnext, custom apps)
   ├─ Configure OAuth settings
   ├─ Disable password login
   └─ Create initial admin user

4. DNS Registration
   ├─ Create wildcard DNS records
   │   ├─ {tenant}.yourapp.com → Frontend (103.224.243.242)
   │   └─ api.{tenant}.yourapp.com → Backend (103.224.243.242)
   └─ Verify DNS propagation

5. SSL Certificate Generation
   ├─ Run: certbot for *.{tenant}.yourapp.com
   └─ Install certificates in Nginx

6. Nginx Configuration
   ├─ Add server block for new tenant
   ├─ Reload nginx: sudo nginx -t && sudo systemctl reload nginx
   └─ Verify tenant is accessible

7. Database Seeding (Optional)
   ├─ Import default data
   ├─ Create sample records
   └─ Configure tenant settings

8. Tenant Activation
   ├─ Mark tenant as "active" in control database
   ├─ Send welcome email to user
   └─ Redirect to tenant dashboard

9. Frontend Access
   ├─ User visits: {tenant}.yourapp.com
   ├─ Middleware extracts tenant name
   ├─ API client resolves: api.{tenant}.yourapp.com
   └─ OAuth login flow initiated

✅ Tenant is LIVE and accessible!
```

---

## Part 1: Provisioning API Endpoint

### Next.js API Route

**File: `app/api/admin/provision-tenant/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ProvisionRequest {
  tenantName: string;      // e.g., "acme"
  adminEmail: string;      // e.g., "admin@acme.com"
  adminPassword: string;   // Initial password
  plan: 'starter' | 'professional' | 'enterprise';
}

interface ProvisionResponse {
  success: boolean;
  tenant: {
    name: string;
    frontendUrl: string;
    backendUrl: string;
    status: 'active' | 'provisioning' | 'failed';
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ProvisionResponse>> {
  try {
    const body: ProvisionRequest = await request.json();
    
    // Validate input
    const validation = validateTenantName(body.tenantName);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        tenant: null as any,
        error: validation.error
      }, { status: 400 });
    }
    
    // Check if tenant already exists
    const exists = await checkTenantExists(body.tenantName);
    if (exists) {
      return NextResponse.json({
        success: false,
        tenant: null as any,
        error: 'Tenant already exists'
      }, { status: 409 });
    }
    
    // Provision tenant (async operation)
    const result = await provisionTenant(body);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        tenant: {
          name: body.tenantName,
          frontendUrl: `https://${body.tenantName}.yourapp.com`,
          backendUrl: `https://api.${body.tenantName}.yourapp.com`,
          status: 'active'
        }
      }, { status: 201 });
    } else {
      return NextResponse.json({
        success: false,
        tenant: null as any,
        error: result.error
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Provisioning error:', error);
    return NextResponse.json({
      success: false,
      tenant: null as any,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

function validateTenantName(name: string): { valid: boolean; error?: string } {
  // DNS-safe validation
  const dnsRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
  
  if (!name || name.length < 3) {
    return { valid: false, error: 'Tenant name must be at least 3 characters' };
  }
  
  if (name.length > 63) {
    return { valid: false, error: 'Tenant name must be less than 63 characters' };
  }
  
  if (!dnsRegex.test(name)) {
    return { valid: false, error: 'Tenant name must contain only lowercase letters, numbers, and hyphens' };
  }
  
  // Reserved names
  const reserved = ['www', 'api', 'auth', 'admin', 'app', 'blog', 'mail', 'ftp', 'localhost'];
  if (reserved.includes(name)) {
    return { valid: false, error: 'This tenant name is reserved' };
  }
  
  return { valid: true };
}

async function checkTenantExists(tenantName: string): Promise<boolean> {
  // Check if Frappe site exists
  const sshCommand = `ssh frappe@103.224.243.242 "cd ~/frappe-bench && bench --site api.${tenantName}.yourapp.com list-apps 2>&1"`;
  
  try {
    await execAsync(sshCommand);
    return true; // Site exists
  } catch (error) {
    return false; // Site doesn't exist
  }
}

async function provisionTenant(data: ProvisionRequest): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Create Frappe site
    console.log(`[Provision] Creating Frappe site for ${data.tenantName}...`);
    await createFrappeSite(data);
    
    // Step 2: Configure site
    console.log(`[Provision] Configuring site for ${data.tenantName}...`);
    await configureSite(data);
    
    // Step 3: Update Nginx
    console.log(`[Provision] Updating Nginx for ${data.tenantName}...`);
    await updateNginx(data.tenantName);
    
    // Step 4: Request SSL certificate
    console.log(`[Provision] Requesting SSL certificate for ${data.tenantName}...`);
    await requestSSL(data.tenantName);
    
    // Step 5: Verify tenant is accessible
    console.log(`[Provision] Verifying ${data.tenantName}...`);
    await verifyTenant(data.tenantName);
    
    console.log(`[Provision] ✅ ${data.tenantName} provisioned successfully!`);
    return { success: true };
    
  } catch (error: any) {
    console.error(`[Provision] ❌ Failed to provision ${data.tenantName}:`, error);
    
    // Attempt rollback
    await rollbackTenant(data.tenantName);
    
    return { 
      success: false, 
      error: error.message || 'Provisioning failed' 
    };
  }
}

async function createFrappeSite(data: ProvisionRequest): Promise<void> {
  const siteName = `api.${data.tenantName}.yourapp.com`;
  
  const command = `ssh frappe@103.224.243.242 << 'EOF'
cd ~/frappe-bench

# Create new site
bench new-site ${siteName} \
  --admin-password "${data.adminPassword}" \
  --db-name "_${data.tenantName.replace(/-/g, '_')}" \
  --verbose

# Install ERPNext
bench --site ${siteName} install-app erpnext

# Install custom apps
bench --site ${siteName} install-app tenant_oauth_auth

# Set site configuration
bench --site ${siteName} set-config disable_user_pass_login 1
bench --site ${siteName} set-config disable_standard_login 1
bench --site ${siteName} set-config disable_signup 1
bench --site ${siteName} set-config oauth_provider_url "https://auth.yourapp.com"

# Restart services
sudo supervisorctl restart all

echo "✅ Site created: ${siteName}"
EOF`;
  
  const { stdout, stderr } = await execAsync(command);
  
  if (stderr && stderr.includes('ERROR')) {
    throw new Error(`Failed to create site: ${stderr}`);
  }
  
  console.log(stdout);
}

async function configureSite(data: ProvisionRequest): Promise<void> {
  const siteName = `api.${data.tenantName}.yourapp.com`;
  
  const command = `ssh frappe@103.224.243.242 << 'EOF'
cd ~/frappe-bench

# Configure via console
bench --site ${siteName} console << PYTHON
import frappe

# Disable website signup
frappe.db.set_value('Website Settings', None, 'disable_signup', 1)

# Set system settings
frappe.db.set_value('System Settings', None, 'country', 'United States')
frappe.db.set_value('System Settings', None, 'time_zone', 'America/New_York')

# Create initial user
if not frappe.db.exists('User', '${data.adminEmail}'):
    user = frappe.get_doc({
        'doctype': 'User',
        'email': '${data.adminEmail}',
        'first_name': 'Admin',
        'enabled': 1,
        'send_welcome_email': 0
    })
    user.insert(ignore_permissions=True)
    user.add_roles('System Manager')
    
frappe.db.commit()
print("✅ Site configured")
PYTHON

EOF`;
  
  await execAsync(command);
}

async function updateNginx(tenantName: string): Promise<void> {
  const nginxConfig = `
# Tenant: ${tenantName}
server {
    listen 80;
    listen 443 ssl http2;
    server_name ${tenantName}.yourapp.com;
    
    ssl_certificate /etc/letsencrypt/live/${tenantName}.yourapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${tenantName}.yourapp.com/privkey.pem;
    
    root /var/www/nexus-erp;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    listen 443 ssl http2;
    server_name api.${tenantName}.yourapp.com;
    
    ssl_certificate /etc/letsencrypt/live/${tenantName}.yourapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${tenantName}.yourapp.com/privkey.pem;
    
    root /home/frappe/frappe-bench/sites;
    
    # Block login routes
    location /login { return 403 "Login disabled. Use OAuth."; }
    location /signup { return 403 "Signup disabled."; }
    location /api/method/login { return 403 "Use OAuth tokens."; }
    
    # API endpoints
    location /api/ {
        proxy_http_version 1.1;
        proxy_set_header X-Frappe-Site-Name $host;
        proxy_set_header Host $host;
        proxy_pass http://localhost:8000;
    }
}
`;
  
  const command = `ssh root@103.224.243.242 << 'EOF'
# Write nginx config
cat > /etc/nginx/sites-available/${tenantName}.conf << 'NGINX'
${nginxConfig}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/${tenantName}.conf /etc/nginx/sites-enabled/

# Test and reload
nginx -t && systemctl reload nginx

echo "✅ Nginx configured for ${tenantName}"
EOF`;
  
  await execAsync(command);
}

async function requestSSL(tenantName: string): Promise<void> {
  const command = `ssh root@103.224.243.242 << 'EOF'
# Request wildcard certificate for tenant
certbot certonly --nginx \
  -d ${tenantName}.yourapp.com \
  -d api.${tenantName}.yourapp.com \
  --non-interactive \
  --agree-tos \
  --email admin@yourapp.com

echo "✅ SSL certificate obtained for ${tenantName}"
EOF`;
  
  try {
    await execAsync(command);
  } catch (error) {
    console.warn('SSL certificate request failed, will retry later:', error);
    // Non-fatal, site will work over HTTP
  }
}

async function verifyTenant(tenantName: string): Promise<void> {
  const backendUrl = `https://api.${tenantName}.yourapp.com/api/method/ping`;
  
  const response = await fetch(backendUrl);
  
  if (!response.ok) {
    throw new Error(`Tenant verification failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.message !== 'pong') {
    throw new Error('Unexpected response from tenant backend');
  }
}

async function rollbackTenant(tenantName: string): Promise<void> {
  console.log(`[Rollback] Attempting rollback for ${tenantName}...`);
  
  try {
    // Remove Frappe site
    await execAsync(`ssh frappe@103.224.243.242 "cd ~/frappe-bench && bench drop-site api.${tenantName}.yourapp.com --force"`);
    
    // Remove Nginx config
    await execAsync(`ssh root@103.224.243.242 "rm -f /etc/nginx/sites-enabled/${tenantName}.conf && systemctl reload nginx"`);
    
    console.log(`[Rollback] ✅ Rollback completed for ${tenantName}`);
  } catch (error) {
    console.error(`[Rollback] ❌ Rollback failed for ${tenantName}:`, error);
  }
}
```

---

## Part 2: Shell Script for Tenant Provisioning

**File: `provision-tenant.sh`**

```bash
#!/bin/bash

###############################################################################
# Automatic Tenant Provisioning Script
# Creates Frappe backend site + configures Nginx + requests SSL
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BENCH_PATH="$HOME/frappe-bench"
FRAPPE_USER="frappe"
DOMAIN="yourapp.com"
BACKEND_PORT=8000
FRONTEND_PORT=3000

# Logging
LOG_FILE="/var/log/tenant-provisioning.log"

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

###############################################################################
# Validate tenant name
###############################################################################
validate_tenant_name() {
    local tenant=$1
    
    # Check length
    if [ ${#tenant} -lt 3 ] || [ ${#tenant} -gt 63 ]; then
        error "Tenant name must be 3-63 characters"
        return 1
    fi
    
    # Check DNS-safe characters
    if ! [[ "$tenant" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]]; then
        error "Tenant name must contain only lowercase letters, numbers, and hyphens"
        return 1
    fi
    
    # Check reserved names
    local reserved=("www" "api" "auth" "admin" "app" "blog" "mail" "ftp" "localhost")
    for name in "${reserved[@]}"; do
        if [ "$tenant" == "$name" ]; then
            error "Tenant name '$tenant' is reserved"
            return 1
        fi
    done
    
    log "✓ Tenant name validated: $tenant"
    return 0
}

###############################################################################
# Check if tenant already exists
###############################################################################
check_tenant_exists() {
    local tenant=$1
    local site_name="api.${tenant}.${DOMAIN}"
    
    cd "$BENCH_PATH"
    
    if bench --site "$site_name" list-apps &>/dev/null; then
        error "Tenant '$tenant' already exists"
        return 0  # Exists
    fi
    
    log "✓ Tenant name available: $tenant"
    return 1  # Does not exist
}

###############################################################################
# Create Frappe site
###############################################################################
create_frappe_site() {
    local tenant=$1
    local admin_password=$2
    local site_name="api.${tenant}.${DOMAIN}"
    local db_name="_${tenant//-/_}"
    
    log "Creating Frappe site: $site_name"
    
    cd "$BENCH_PATH"
    
    # Create site
    bench new-site "$site_name" \
        --admin-password "$admin_password" \
        --db-name "$db_name" \
        --verbose || {
            error "Failed to create site"
            return 1
        }
    
    log "✓ Site created: $site_name"
    
    # Install apps
    log "Installing ERPNext..."
    bench --site "$site_name" install-app erpnext || warn "ERPNext installation failed"
    
    log "Installing custom OAuth app..."
    bench --site "$site_name" install-app tenant_oauth_auth || warn "Custom app installation failed"
    
    # Configure site for API-only mode
    log "Configuring API-only mode..."
    bench --site "$site_name" set-config disable_user_pass_login 1
    bench --site "$site_name" set-config disable_standard_login 1
    bench --site "$site_name" set-config disable_signup 1
    bench --site "$site_name" set-config oauth_provider_url "https://auth.${DOMAIN}"
    
    log "✓ Site configured: $site_name"
    
    return 0
}

###############################################################################
# Configure site settings via console
###############################################################################
configure_site_settings() {
    local tenant=$1
    local admin_email=$2
    local site_name="api.${tenant}.${DOMAIN}"
    
    log "Configuring site settings..."
    
    cd "$BENCH_PATH"
    
    bench --site "$site_name" console << PYTHON
import frappe

# Disable website signup
frappe.db.set_value('Website Settings', None, 'disable_signup', 1)

# System settings
frappe.db.set_value('System Settings', None, 'country', 'United States')
frappe.db.set_value('System Settings', None, 'time_zone', 'America/New_York')

# Create admin user
if not frappe.db.exists('User', '$admin_email'):
    user = frappe.get_doc({
        'doctype': 'User',
        'email': '$admin_email',
        'first_name': 'Admin',
        'enabled': 1,
        'send_welcome_email': 0
    })
    user.insert(ignore_permissions=True)
    user.add_roles('System Manager')

frappe.db.commit()
print("✅ Site settings configured")
PYTHON
    
    log "✓ Site settings configured"
    return 0
}

###############################################################################
# Update Nginx configuration
###############################################################################
update_nginx() {
    local tenant=$1
    local config_file="/etc/nginx/sites-available/${tenant}.conf"
    
    log "Creating Nginx configuration..."
    
    cat > "$config_file" << NGINX
# Tenant: ${tenant}
# Generated: $(date)

# Frontend
server {
    listen 80;
    listen 443 ssl http2;
    server_name ${tenant}.${DOMAIN};
    
    # SSL configuration (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/${tenant}.${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${tenant}.${DOMAIN}/privkey.pem;
    
    root /var/www/nexus-erp;
    
    location / {
        proxy_pass http://localhost:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Tenant header
        proxy_set_header X-Tenant ${tenant};
    }
}

# Backend API
server {
    listen 80;
    listen 443 ssl http2;
    server_name api.${tenant}.${DOMAIN};
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/${tenant}.${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${tenant}.${DOMAIN}/privkey.pem;
    
    root ${BENCH_PATH}/sites;
    
    # Block login routes
    location /login {
        return 403 "Login disabled. Use OAuth authentication.";
    }
    
    location /signup {
        return 403 "Signup disabled.";
    }
    
    location /api/method/login {
        return 403 "Password login disabled. Use OAuth tokens.";
    }
    
    # API endpoints
    location /api/ {
        proxy_http_version 1.1;
        proxy_set_header X-Frappe-Site-Name \$host;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_pass http://localhost:${BACKEND_PORT};
    }
    
    # Static assets
    location /assets/ {
        try_files \$uri =404;
    }
    
    location /files/ {
        try_files \$uri =404;
    }
}
NGINX
    
    # Enable site
    ln -sf "$config_file" "/etc/nginx/sites-enabled/${tenant}.conf"
    
    # Test configuration
    nginx -t || {
        error "Nginx configuration test failed"
        rm -f "/etc/nginx/sites-enabled/${tenant}.conf"
        return 1
    }
    
    # Reload nginx
    systemctl reload nginx
    
    log "✓ Nginx configured and reloaded"
    return 0
}

###############################################################################
# Request SSL certificate
###############################################################################
request_ssl() {
    local tenant=$1
    
    log "Requesting SSL certificate for ${tenant}.${DOMAIN}..."
    
    certbot certonly --nginx \
        -d "${tenant}.${DOMAIN}" \
        -d "api.${tenant}.${DOMAIN}" \
        --non-interactive \
        --agree-tos \
        --email "admin@${DOMAIN}" || {
            warn "SSL certificate request failed (non-fatal)"
            return 1
        }
    
    # Reload nginx to apply SSL
    systemctl reload nginx
    
    log "✓ SSL certificate obtained"
    return 0
}

###############################################################################
# Verify tenant is accessible
###############################################################################
verify_tenant() {
    local tenant=$1
    local backend_url="https://api.${tenant}.${DOMAIN}/api/method/ping"
    
    log "Verifying tenant is accessible..."
    
    sleep 5  # Wait for services to start
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$backend_url" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        log "✓ Tenant verified: $backend_url"
        return 0
    else
        error "Tenant verification failed (HTTP $response)"
        return 1
    fi
}

###############################################################################
# Rollback on failure
###############################################################################
rollback_tenant() {
    local tenant=$1
    local site_name="api.${tenant}.${DOMAIN}"
    
    warn "Rolling back tenant: $tenant"
    
    # Drop Frappe site
    cd "$BENCH_PATH"
    bench drop-site "$site_name" --force 2>/dev/null || true
    
    # Remove Nginx config
    rm -f "/etc/nginx/sites-enabled/${tenant}.conf"
    rm -f "/etc/nginx/sites-available/${tenant}.conf"
    systemctl reload nginx 2>/dev/null || true
    
    # Revoke SSL certificate
    certbot revoke --cert-name "${tenant}.${DOMAIN}" 2>/dev/null || true
    
    log "Rollback completed"
}

###############################################################################
# Main provisioning function
###############################################################################
provision_tenant() {
    local tenant=$1
    local admin_email=$2
    local admin_password=$3
    
    log "=========================================="
    log "Starting tenant provisioning: $tenant"
    log "=========================================="
    
    # Validate
    validate_tenant_name "$tenant" || return 1
    
    # Check existence
    if check_tenant_exists "$tenant"; then
        return 1
    fi
    
    # Create site
    create_frappe_site "$tenant" "$admin_password" || {
        rollback_tenant "$tenant"
        return 1
    }
    
    # Configure settings
    configure_site_settings "$tenant" "$admin_email" || {
        rollback_tenant "$tenant"
        return 1
    }
    
    # Update Nginx
    update_nginx "$tenant" || {
        rollback_tenant "$tenant"
        return 1
    }
    
    # Request SSL
    request_ssl "$tenant" || warn "SSL setup incomplete"
    
    # Restart services
    log "Restarting services..."
    sudo supervisorctl restart all
    
    # Verify
    verify_tenant "$tenant" || {
        error "Tenant verification failed"
        return 1
    }
    
    log "=========================================="
    log "✅ Tenant provisioned successfully!"
    log "Frontend: https://${tenant}.${DOMAIN}"
    log "Backend: https://api.${tenant}.${DOMAIN}"
    log "=========================================="
    
    return 0
}

###############################################################################
# Usage
###############################################################################
usage() {
    echo "Usage: $0 <tenant-name> <admin-email> <admin-password>"
    echo ""
    echo "Example:"
    echo "  $0 acme admin@acme.com SecurePass123"
    echo ""
    exit 1
}

###############################################################################
# Main
###############################################################################
main() {
    if [ "$#" -ne 3 ]; then
        usage
    fi
    
    local tenant=$1
    local admin_email=$2
    local admin_password=$3
    
    # Check if running as root/sudo
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run with sudo"
        exit 1
    fi
    
    # Provision tenant
    if provision_tenant "$tenant" "$admin_email" "$admin_password"; then
        exit 0
    else
        exit 1
    fi
}

# Run
main "$@"
```

**Make executable:**

```bash
chmod +x provision-tenant.sh
```

**Usage:**

```bash
# Provision new tenant
sudo ./provision-tenant.sh acme admin@acme.com SecurePass123

# Provision another tenant
sudo ./provision-tenant.sh contoso admin@contoso.com AnotherPass456
```

---

## Part 3: DNS Registration

### Option 1: Cloudflare API (Recommended)

**Install Cloudflare CLI:**

```bash
npm install -g cloudflare-cli
```

**Script: `register-dns.sh`**

```bash
#!/bin/bash

TENANT=$1
CLOUDFLARE_EMAIL="your-email@example.com"
CLOUDFLARE_API_KEY="your-api-key"
ZONE_ID="your-zone-id"
SERVER_IP="103.224.243.242"

# Create DNS records
create_dns_record() {
    local name=$1
    
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
        -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
        -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
        -H "Content-Type: application/json" \
        --data "{
            \"type\": \"A\",
            \"name\": \"$name\",
            \"content\": \"$SERVER_IP\",
            \"ttl\": 1,
            \"proxied\": true
        }"
}

# Create frontend record
create_dns_record "$TENANT.yourapp.com"

# Create backend record
create_dns_record "api.$TENANT.yourapp.com"

echo "✅ DNS records created for $TENANT"
```

### Option 2: Manual DNS Configuration

Add these records to your DNS provider:

```
Type   Name                      Value              TTL
A      acme.yourapp.com          103.224.243.242    Auto
A      api.acme.yourapp.com      103.224.243.242    Auto
```

### Option 3: Wildcard DNS (Production)

**Single wildcard record:**

```
Type   Name              Value              TTL
A      *.yourapp.com     103.224.243.242    Auto
```

This automatically routes ALL subdomains to your server.

---

## Part 4: Frontend Live Status

### Frontend is ALWAYS Live

Your Next.js frontend doesn't need changes because:

1. **Middleware is dynamic**: Extracts tenant from any hostname
2. **API client is dynamic**: Resolves backend URL from hostname
3. **No hardcoded tenant lists**: Works with any subdomain

**How it works:**

```typescript
// User visits: acme.yourapp.com
// ↓
// middleware.ts extracts: "acme"
// ↓
// API client resolves: api.acme.yourapp.com
// ↓
// Frappe site exists → ✅ Works!
```

### Verification Flow

```bash
# 1. Provision tenant
sudo ./provision-tenant.sh acme admin@acme.com pass123

# 2. User immediately visits
curl https://acme.yourapp.com
# ✅ Frontend loads

# 3. Frontend makes API call
curl https://api.acme.yourapp.com/api/method/ping \
  -H "Authorization: Bearer token"
# ✅ Backend responds

# 4. OAuth login works
curl https://acme.yourapp.com/auth/login
# ✅ Redirects to auth.yourapp.com
```

---

## Part 5: Failure Handling

### Error Scenarios & Recovery

```
┌──────────────────────────────────────────────────────┐
│              FAILURE HANDLING MATRIX                  │
└──────────────────────────────────────────────────────┘

1. Site Creation Fails
   ├─ Error: Database already exists
   ├─ Solution: Drop database manually
   │   └─ bench drop-site api.tenant.com --force
   └─ Rollback: Delete partially created files

2. App Installation Fails
   ├─ Error: App not found in apps directory
   ├─ Solution: Ensure app is in bench/apps
   │   └─ bench get-app https://github.com/app
   └─ Retry: Re-run install-app command

3. Nginx Configuration Invalid
   ├─ Error: nginx -t fails
   ├─ Solution: Fix syntax errors
   └─ Rollback: Remove config, reload nginx

4. SSL Certificate Request Fails
   ├─ Error: DNS not propagated, rate limit
   ├─ Solution: Wait for DNS, use staging cert
   │   └─ certbot --staging
   └─ Workaround: Serve over HTTP temporarily

5. DNS Not Propagated
   ├─ Error: 404 on subdomain
   ├─ Solution: Wait 1-5 minutes
   │   └─ dig +short tenant.yourapp.com
   └─ Workaround: Add to /etc/hosts locally

6. Backend Not Responding
   ├─ Error: 502 Bad Gateway
   ├─ Solution: Restart supervisor services
   │   └─ sudo supervisorctl restart all
   └─ Debug: Check bench status, logs

7. OAuth Configuration Missing
   ├─ Error: Invalid OAuth provider
   ├─ Solution: Configure OAuth client on auth site
   └─ Check: bench --site auth.com show-config

8. Database Connection Failed
   ├─ Error: Access denied for user
   ├─ Solution: Verify MariaDB credentials
   │   └─ mysql -u root -p
   └─ Reset: Update site_config.json password

9. Disk Space Exhausted
   ├─ Error: No space left on device
   ├─ Solution: Clean up logs, backups
   │   └─ bench clear-cache
   └─ Monitor: df -h

10. Port Already in Use
    ├─ Error: Address already in use
    ├─ Solution: Kill process on port
    │   └─ sudo lsof -ti:8000 | xargs kill -9
    └─ Verify: netstat -tulpn | grep 8000
```

### Automated Health Checks

**Script: `health-check.sh`**

```bash
#!/bin/bash

TENANT=$1
DOMAIN="yourapp.com"

echo "Running health checks for $TENANT..."

# Check 1: DNS resolution
echo -n "DNS resolution: "
if dig +short "${TENANT}.${DOMAIN}" | grep -q "103.224.243.242"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Check 2: Frontend accessible
echo -n "Frontend HTTP: "
if curl -sL -o /dev/null -w "%{http_code}" "https://${TENANT}.${DOMAIN}" | grep -q "200"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Check 3: Backend ping
echo -n "Backend ping: "
if curl -sL "https://api.${TENANT}.${DOMAIN}/api/method/ping" | grep -q "pong"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Check 4: SSL certificate
echo -n "SSL certificate: "
if echo | openssl s_client -connect "${TENANT}.${DOMAIN}:443" 2>/dev/null | grep -q "Verify return code: 0"; then
    echo "✅ PASS"
else
    echo "⚠️  WARN"
fi

# Check 5: Frappe site status
echo -n "Frappe site: "
if sudo -u frappe bench --site "api.${TENANT}.${DOMAIN}" list-apps &>/dev/null; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

echo ""
echo "Health check complete!"
```

---

## Part 6: Complete Provisioning Workflow

### Production Provisioning Flow

```bash
#!/bin/bash
# Full production provisioning

TENANT="acme"
ADMIN_EMAIL="admin@acme.com"
ADMIN_PASSWORD="SecurePassword123"

echo "🚀 Provisioning tenant: $TENANT"

# Step 1: Provision backend
echo "📦 Creating Frappe backend..."
sudo ./provision-tenant.sh "$TENANT" "$ADMIN_EMAIL" "$ADMIN_PASSWORD"

if [ $? -ne 0 ]; then
    echo "❌ Backend provisioning failed"
    exit 1
fi

# Step 2: Register DNS (if not using wildcard)
echo "🌐 Registering DNS..."
./register-dns.sh "$TENANT"

# Step 3: Wait for DNS propagation
echo "⏳ Waiting for DNS propagation..."
while ! dig +short "${TENANT}.yourapp.com" | grep -q "103.224.243.242"; do
    echo "Waiting..."
    sleep 10
done
echo "✅ DNS propagated"

# Step 4: Request SSL certificate
echo "🔒 Requesting SSL certificate..."
sudo certbot certonly --nginx \
    -d "${TENANT}.yourapp.com" \
    -d "api.${TENANT}.yourapp.com" \
    --non-interactive \
    --agree-tos

# Step 5: Run health checks
echo "🏥 Running health checks..."
./health-check.sh "$TENANT"

# Step 6: Send welcome email (placeholder)
echo "📧 Sending welcome email..."
# Add your email sending logic here

echo ""
echo "✅ Tenant provisioned successfully!"
echo "Frontend: https://${TENANT}.yourapp.com"
echo "Backend:  https://api.${TENANT}.yourapp.com"
echo "Admin:    $ADMIN_EMAIL"
```

---

## Summary

### Provisioning Commands

```bash
# Single tenant
sudo ./provision-tenant.sh acme admin@acme.com pass123

# Verify
./health-check.sh acme

# Rollback if needed
bench drop-site api.acme.yourapp.com --force
```

### Key Points

✅ **Frontend unchanged**: Works with any subdomain dynamically  
✅ **Backend created**: Frappe site provisioned automatically  
✅ **DNS registered**: Either wildcard or per-tenant A records  
✅ **SSL configured**: Certbot obtains certificates  
✅ **Health checks**: Automated verification  
✅ **Rollback ready**: Failures trigger automatic cleanup  

### Testing

```bash
# Test new tenant immediately
curl https://acme.yourapp.com
curl https://api.acme.yourapp.com/api/method/ping

# Both should work instantly after provisioning!
```

Your tenant provisioning is now **fully automated**! 🚀
