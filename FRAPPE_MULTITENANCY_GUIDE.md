# Frappe Multi-Tenancy Architecture Guide

## How Frappe Resolves Sites by Hostname

Frappe uses **hostname-based site resolution** at the web server level. Here's how it works:

### 1. Request Flow
```
Browser Request (tenant1.localhost)
    ↓
Nginx/Apache Web Server
    ↓
Read Host header from HTTP request
    ↓
Match hostname to site directory in sites/
    ↓
Load site-specific site_config.json
    ↓
Connect to site-specific database
    ↓
Serve response
```

### 2. Directory Structure
```
frappe-bench/
├── sites/
│   ├── common_site_config.json       # Global config
│   ├── currentsite.txt               # Default site (optional)
│   ├── assets/                       # Shared assets
│   ├── tenant1.localhost/            # Site 1
│   │   ├── site_config.json          # Site 1 config
│   │   ├── private/                  # Site 1 private files
│   │   └── public/                   # Site 1 public files
│   ├── tenant2.localhost/            # Site 2
│   │   ├── site_config.json          # Site 2 config
│   │   ├── private/
│   │   └── public/
│   └── api.tenant1.localhost/        # API subdomain site
│       ├── site_config.json
│       ├── private/
│       └── public/
```

### 3. Site Resolution Logic

Frappe resolves sites in this order:

1. **Exact hostname match**: `tenant1.localhost` → `sites/tenant1.localhost/`
2. **Wildcard match** (if configured): `*.localhost` → default site
3. **currentsite.txt fallback**: Uses site specified in this file
4. **Error**: Returns "Site Not Found" if no match

### 4. Database Architecture

Each site has its own database:
```
MariaDB/PostgreSQL
├── _tenant1_localhost          # Database for tenant1.localhost
├── _tenant2_localhost          # Database for tenant2.localhost
├── _api_tenant1_localhost      # Database for api.tenant1.localhost
└── _api_tenant2_localhost      # Database for api.tenant2.localhost
```

**Key Points:**
- Database names are auto-generated from site names
- Special characters (`.`, `-`) are converted to underscores
- Each database has its own user credentials
- Complete data isolation between tenants

---

## Bench Commands for Multi-Tenant Setup

### Prerequisites
```bash
# Install bench and Frappe
pip3 install frappe-bench

# Initialize bench (if not already done)
bench init frappe-bench --frappe-branch version-15
cd frappe-bench
```

### 1. Create Tenant Sites

```bash
# Navigate to bench directory
cd ~/frappe-bench

# Create tenant1 site
bench new-site tenant1.localhost \
  --mariadb-root-password your_root_password \
  --admin-password admin_password_tenant1

# Create tenant2 site
bench new-site tenant2.localhost \
  --mariadb-root-password your_root_password \
  --admin-password admin_password_tenant2

# Create tenant3 site
bench new-site tenant3.localhost \
  --mariadb-root-password your_root_password \
  --admin-password admin_password_tenant3

# Create API subdomain sites (if needed)
bench new-site api.tenant1.localhost \
  --mariadb-root-password your_root_password \
  --admin-password admin_password_api1

bench new-site api.tenant2.localhost \
  --mariadb-root-password your_root_password \
  --admin-password admin_password_api2
```

### 2. Install ERPNext (Optional)

```bash
# Get ERPNext app
bench get-app erpnext --branch version-15

# Install ERPNext on tenant1
bench --site tenant1.localhost install-app erpnext

# Install ERPNext on tenant2
bench --site tenant2.localhost install-app erpnext

# Install on all sites
bench --site all install-app erpnext
```

### 3. Configure DNS Resolution

#### Option A: Local Hosts File (Development)

**Linux/Mac**: `/etc/hosts`
```bash
sudo nano /etc/hosts
```

**Windows**: `C:\Windows\System32\drivers\etc\hosts`

Add entries:
```
127.0.0.1 tenant1.localhost
127.0.0.1 tenant2.localhost
127.0.0.1 tenant3.localhost
127.0.0.1 api.tenant1.localhost
127.0.0.1 api.tenant2.localhost
127.0.0.1 api.tenant3.localhost
```

#### Option B: Wildcard DNS (Production)

Configure DNS A records for your domain:
```
tenant1.example.com     → Your Server IP
tenant2.example.com     → Your Server IP
api.tenant1.example.com → Your Server IP
api.tenant2.example.com → Your Server IP
```

Or use wildcard:
```
*.example.com           → Your Server IP
*.localhost             → 127.0.0.1 (for local VM)
```

### 4. Setup Multi-Tenant Bench

```bash
# Enable DNS-based multi-tenancy
bench config dns_multitenant on

# Setup production with Nginx
bench setup nginx

# Restart Nginx
sudo service nginx reload

# OR for development, enable multi-site access
bench use tenant1.localhost  # Set default site
bench start  # Start development server
```

### 5. Enable Multi-Site Development Server

By default, `bench start` only serves one site. For multi-site in development:

```bash
# Method 1: Use production setup even in development
bench setup nginx
bench setup supervisor
sudo supervisorctl reload all
sudo service nginx reload

# Method 2: Start with specific site binding
bench serve --port 8000 --site tenant1.localhost

# Method 3: Use production mode
bench setup production frappe_user
```

---

## Configuration Files

### common_site_config.json

Location: `~/frappe-bench/sites/common_site_config.json`

```json
{
  "auto_update": false,
  "background_workers": 1,
  "db_type": "mariadb",
  "db_host": "127.0.0.1",
  "db_port": 3306,
  "dns_multitenant": true,
  "serve_default_site": false,
  "webserver_port": 8000,
  "socketio_port": 9000,
  "gunicorn_workers": 4,
  "file_watcher_port": 6787,
  "rebase_on_pull": false,
  "redis_cache": "redis://127.0.0.1:13000",
  "redis_queue": "redis://127.0.0.1:11000",
  "redis_socketio": "redis://127.0.0.1:12000",
  "restart_supervisor_on_update": false,
  "restart_systemd_on_update": false,
  "shallow_clone": true,
  "update_bench_on_update": true,
  "use_redis_auth": false,
  "developer_mode": 1,
  "disable_auto_cache_clear": false,
  "host_name": "http://localhost:8000",
  "http_timeout": 120,
  "mail_server": "",
  "mail_login": "",
  "mail_password": "",
  "mail_port": 587,
  "use_ssl": 0,
  "mail_sender": "",
  "mute_emails": 1,
  "skip_setup_wizard": 0,
  "encryption_key": "",
  "admin_password": ""
}
```

### Individual Site Config (Example)

Location: `~/frappe-bench/sites/tenant1.localhost/site_config.json`

```json
{
  "db_name": "_tenant1_localhost",
  "db_password": "generated_password_here",
  "db_type": "mariadb",
  "encryption_key": "generated_key_here",
  "host_name": "http://tenant1.localhost:8000",
  "mute_emails": 1,
  "developer_mode": 1
}
```

---

## Nginx Configuration (Auto-Generated)

Location: `/etc/nginx/conf.d/frappe-bench.conf`

```nginx
upstream frappe-bench-frappe {
    server 127.0.0.1:8000 fail_timeout=0;
}

upstream frappe-bench-socketio {
    server 127.0.0.1:9000 fail_timeout=0;
}

# Wildcard server block for all tenant sites
server {
    listen 80;
    server_name
        tenant1.localhost
        tenant2.localhost
        tenant3.localhost
        api.tenant1.localhost
        api.tenant2.localhost
        api.tenant3.localhost;

    root /home/frappe/frappe-bench/sites;

    # Resolve site by hostname
    add_header X-Frappe-Site-Name $host always;
    
    location /assets {
        try_files $uri =404;
    }

    location ~ ^/protected/(.*) {
        internal;
        try_files /$host/$1 =404;
    }

    location /socket.io {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Frappe-Site-Name $host;
        proxy_set_header Origin $scheme://$http_host;
        proxy_set_header Host $host;
        proxy_pass http://frappe-bench-socketio;
    }

    location / {
        rewrite ^(.+)/$ $1 permanent;
        rewrite ^(.+)/index\.html$ $1 permanent;
        rewrite ^(.+)\.html$ $1 permanent;

        location ~* ^/files/.*.(htm|html|svg|xml) {
            add_header Content-disposition "attachment";
            try_files /$host/public/$uri @webserver;
        }

        try_files /$host/public/$uri @webserver;
    }

    location @webserver {
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Frappe-Site-Name $host;
        proxy_set_header Host $host;
        proxy_set_header X-Use-X-Accel-Redirect True;
        proxy_read_timeout 120;
        proxy_redirect off;

        proxy_pass http://frappe-bench-frappe;
    }

    # Error pages
    error_page 502 /502.html;
    location /502.html {
        root /home/frappe/frappe-bench/sites;
        internal;
    }

    # Block access to sensitive files
    location ~ /\. {
        deny all;
    }

    location ~* ^/files/.*\.(py|pyc|pyo|php|sh|js|json|md|yml|yaml|conf|cfg|ini|log|db|sql)$ {
        deny all;
    }
}
```

---

## Verification Steps

### 1. Verify Sites Were Created

```bash
cd ~/frappe-bench

# List all sites
bench --site all list-apps

# Check specific site
ls -la sites/tenant1.localhost/

# Verify database exists
mysql -u root -p -e "SHOW DATABASES LIKE '%tenant%';"
```

Expected output:
```
_tenant1_localhost
_tenant2_localhost
_api_tenant1_localhost
```

### 2. Test Site Access via CLI

```bash
# Bench console for tenant1
bench --site tenant1.localhost console

# In Python console:
>>> frappe.local.site
'tenant1.localhost'
>>> frappe.db.get_value("Website Settings", None, "home_page")
'login'
>>> exit()

# Get site status
bench --site tenant1.localhost migrate
bench --site tenant1.localhost backup
bench --site tenant1.localhost doctor
```

### 3. Test via curl (HTTP Requests)

```bash
# Test tenant1
curl -H "Host: tenant1.localhost" http://localhost:8000/api/method/ping
curl http://tenant1.localhost:8000/api/method/ping

# Expected response:
# {"message":"pong"}

# Test tenant2
curl -H "Host: tenant2.localhost" http://localhost:8000/api/method/ping
curl http://tenant2.localhost:8000/api/method/ping

# Test API endpoint
curl http://api.tenant1.localhost:8000/api/method/frappe.auth.get_logged_user

# Test with authentication
curl -X POST http://tenant1.localhost:8000/api/method/login \
  -H "Content-Type: application/json" \
  -d '{"usr":"Administrator","pwd":"admin_password_tenant1"}'

# Test authenticated request
curl http://tenant1.localhost:8000/api/method/frappe.auth.get_logged_user \
  -H "Cookie: sid=YOUR_SESSION_ID_HERE; system_user=yes"

# Check site info
curl http://tenant1.localhost:8000/api/method/frappe.utils.get_site_info \
  -H "Cookie: sid=YOUR_SESSION_ID_HERE"
```

### 4. Browser Verification

Open in browser:
- `http://tenant1.localhost:8000` → Should show tenant1 login
- `http://tenant2.localhost:8000` → Should show tenant2 login
- `http://tenant3.localhost:8000` → Should show tenant3 login

Login credentials:
- **Username**: Administrator
- **Password**: (password set during site creation)

### 5. Verify Database Isolation

```bash
# Connect to tenant1 database
mysql -u root -p

# Check databases
SHOW DATABASES LIKE '%tenant%';

# Verify different databases
USE _tenant1_localhost;
SELECT * FROM tabUser LIMIT 1;

USE _tenant2_localhost;
SELECT * FROM tabUser LIMIT 1;

# Databases should have different data (different user GUIDs)
```

### 6. Test API Authentication

```bash
# Get API keys for tenant1
bench --site tenant1.localhost console

# In console:
>>> frappe.get_doc({
...     "doctype": "User",
...     "email": "test@tenant1.com",
...     "first_name": "Test User",
...     "send_welcome_email": 0
... }).insert()
>>> 
>>> frappe.get_doc("User", "test@tenant1.com").api_key = frappe.generate_hash()
>>> frappe.get_doc("User", "test@tenant1.com").api_secret = frappe.generate_hash()
>>> frappe.db.commit()
>>> print(frappe.get_doc("User", "test@tenant1.com").api_key)
>>> print(frappe.get_doc("User", "test@tenant1.com").api_secret)

# Use API key/secret to authenticate
curl http://tenant1.localhost:8000/api/method/frappe.auth.get_logged_user \
  -H "Authorization: token API_KEY:API_SECRET"
```

---

## Troubleshooting

### Issue: "Site Not Found"

**Solution:**
```bash
# Check if site exists
ls ~/frappe-bench/sites/

# Verify DNS resolution
ping tenant1.localhost

# Check common_site_config.json
cat ~/frappe-bench/sites/common_site_config.json | grep dns_multitenant

# Should show: "dns_multitenant": true
```

### Issue: All sites showing same content

**Solution:**
```bash
# Ensure DNS multitenant is enabled
bench config dns_multitenant on

# Restart services
sudo service nginx reload
sudo supervisorctl restart all

# Verify Nginx is passing correct hostname
curl -v http://tenant1.localhost:8000 2>&1 | grep "X-Frappe-Site-Name"
```

### Issue: Database connection errors

**Solution:**
```bash
# Check site config
cat ~/frappe-bench/sites/tenant1.localhost/site_config.json

# Verify database exists
mysql -u root -p -e "SHOW DATABASES LIKE '%tenant1%';"

# Test database connection
bench --site tenant1.localhost mariadb
```

### Issue: 502 Bad Gateway

**Solution:**
```bash
# Check if bench is running
ps aux | grep gunicorn

# Check supervisor status
sudo supervisorctl status

# Restart services
sudo supervisorctl restart all
sudo service nginx restart

# Check logs
tail -f ~/frappe-bench/logs/web.error.log
tail -f ~/frappe-bench/logs/web.log
```

---

## Complete Setup Script

Save as `setup_multitenant.sh`:

```bash
#!/bin/bash

# Configuration
BENCH_PATH="$HOME/frappe-bench"
MARIADB_ROOT_PWD="your_root_password"
TENANTS=("tenant1" "tenant2" "tenant3")
DOMAIN="localhost"
ADMIN_PWD="admin123"

echo "🚀 Setting up Frappe Multi-Tenant Environment"

# Navigate to bench
cd "$BENCH_PATH" || exit 1

# Enable DNS multitenant
echo "📝 Enabling DNS multitenant..."
bench config dns_multitenant on

# Create sites
for tenant in "${TENANTS[@]}"; do
    SITE_NAME="${tenant}.${DOMAIN}"
    echo "🏗️  Creating site: $SITE_NAME"
    
    bench new-site "$SITE_NAME" \
        --mariadb-root-password "$MARIADB_ROOT_PWD" \
        --admin-password "$ADMIN_PWD" \
        --no-mariadb-socket
    
    echo "✅ Site $SITE_NAME created"
done

# Create API subdomain sites
for tenant in "${TENANTS[@]}"; do
    API_SITE="api.${tenant}.${DOMAIN}"
    echo "🌐 Creating API site: $API_SITE"
    
    bench new-site "$API_SITE" \
        --mariadb-root-password "$MARIADB_ROOT_PWD" \
        --admin-password "$ADMIN_PWD" \
        --no-mariadb-socket
    
    echo "✅ API site $API_SITE created"
done

# Setup production
echo "⚙️  Setting up production environment..."
sudo bench setup production "$USER"

# Reload services
echo "🔄 Reloading services..."
sudo supervisorctl reload
sudo service nginx reload

echo "✅ Multi-tenant setup complete!"
echo ""
echo "📋 Access your sites:"
for tenant in "${TENANTS[@]}"; do
    echo "   - http://${tenant}.${DOMAIN}:8000"
    echo "   - http://api.${tenant}.${DOMAIN}:8000"
done
echo ""
echo "🔐 Login credentials:"
echo "   Username: Administrator"
echo "   Password: $ADMIN_PWD"
```

Run with:
```bash
chmod +x setup_multitenant.sh
./setup_multitenant.sh
```

---

## Local VM Setup

### 1. VM Configuration

**Recommended specs:**
- OS: Ubuntu 20.04 or 22.04 LTS
- RAM: 4GB minimum, 8GB recommended
- CPU: 2 cores minimum
- Disk: 40GB minimum

### 2. Install Dependencies

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install prerequisites
sudo apt-get install -y \
    git python3-dev python3-pip python3-setuptools \
    python3-venv software-properties-common mariadb-server \
    mariadb-client redis-server nginx supervisor curl

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install yarn
sudo npm install -g yarn

# Install wkhtmltopdf
sudo apt-get install -y xvfb libfontconfig wkhtmltopdf
```

### 3. Setup MariaDB

```bash
sudo mysql_secure_installation

# Create MariaDB config
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf
```

Add:
```ini
[mysqld]
character-set-client-handshake = FALSE
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

[mysql]
default-character-set = utf8mb4
```

Restart:
```bash
sudo service mysql restart
```

### 4. Install Bench & Frappe

```bash
sudo pip3 install frappe-bench

bench init frappe-bench --frappe-branch version-15
cd frappe-bench
```

### 5. Configure VM Networking

**Port forwarding** (if using VirtualBox/VMware):
- Forward host port 8000 → VM port 8000
- Forward host port 80 → VM port 80
- Forward host port 443 → VM port 443

**Access from host machine:**
```bash
# On host machine, update /etc/hosts (Mac/Linux) or 
# C:\Windows\System32\drivers\etc\hosts (Windows)

192.168.56.101 tenant1.localhost tenant2.localhost tenant3.localhost
192.168.56.101 api.tenant1.localhost api.tenant2.localhost
```

(Replace `192.168.56.101` with your VM's IP)

### 6. Test from Host

```bash
# From your host machine
curl http://tenant1.localhost:8000/api/method/ping
curl http://tenant2.localhost:8000/api/method/ping
```

---

## Production Checklist

- [ ] Enable HTTPS with SSL certificates
- [ ] Setup firewall (UFW)
- [ ] Configure fail2ban
- [ ] Enable site backups
- [ ] Setup monitoring (Prometheus/Grafana)
- [ ] Configure email settings per site
- [ ] Enable rate limiting
- [ ] Setup log rotation
- [ ] Configure CDN for assets
- [ ] Enable Redis authentication
- [ ] Secure database with strong passwords
- [ ] Setup automated updates

---

## Summary

✅ **Frappe resolves sites by HTTP Host header**  
✅ **Each site = separate database = complete isolation**  
✅ **No shared data, no schema hacks**  
✅ **DNS multitenant mode handles routing automatically**  
✅ **Nginx passes hostname to backend via X-Frappe-Site-Name**  
✅ **Works seamlessly in local VM and production**

This is **true multi-tenancy** with complete data isolation!
