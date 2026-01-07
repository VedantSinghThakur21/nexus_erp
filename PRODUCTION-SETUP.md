# Production Deployment Guide - Nexus ERP

## Current Setup: Single Domain (Development-Ready Production)

This setup allows full multi-tenancy WITHOUT requiring DNS subdomains. Perfect for development and feature work.

### Architecture
- **Tenant routing**: Via session cookies (`tenant_subdomain`)
- **Domain**: Single domain (nexuserp.com or IP address)
- **Isolation**: Complete database isolation per tenant
- **No DNS needed**: Works immediately without subdomain configuration

---

## Step 1: Install PM2 Process Manager

```bash
# On Ubuntu server
sudo npm install -g pm2

# Navigate to project
cd ~/nexus_web

# Build Next.js for production
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Save process list
pm2 save

# Enable auto-start on server reboot
pm2 startup
# Follow the command it outputs
```

**PM2 Commands:**
```bash
pm2 status              # View running apps
pm2 logs nexus-erp      # View logs
pm2 restart nexus-erp   # Restart app
pm2 stop nexus-erp      # Stop app
pm2 monit               # Live monitoring
```

---

## Step 2: Install and Configure Nginx

```bash
# Install Nginx
sudo apt update
sudo apt install nginx

# Copy config file
sudo cp ~/nexus_web/nginx-nexus-erp.conf /etc/nginx/sites-available/nexus-erp

# Enable site
sudo ln -s /etc/nginx/sites-available/nexus-erp /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Step 3: Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Step 4: Environment Variables

Ensure `.env.local` has production values:

```env
# ERPNext Connection
ERP_NEXT_URL=http://127.0.0.1:8080
ERP_API_KEY=eba7f726e91214d
ERP_API_SECRET=23572bee8794dc7

# App Configuration
NEXT_PUBLIC_APP_URL=http://nexuserp.com
NODE_ENV=production

# Docker paths (keep existing)
DOCKER_COMPOSE_PATH=/home/ubuntu/frappe_docker
PROVISIONING_SCRIPT_PATH=/home/ubuntu/frappe_docker/custom_scripts/provision-site-simple.sh
```

---

## Step 5: Test Multi-Tenancy

### Sign Up Test
1. Go to: `http://nexuserp.com` (or `http://103.224.243.242`)
2. Sign up with new account
3. Wait 4-5 minutes for site provisioning
4. You'll be redirected to `/dashboard`
5. All your data is isolated in a separate ERPNext site

### Login Test
1. Log out
2. Login with your credentials
3. System looks up your tenant by email
4. Authenticates against YOUR tenant's site
5. Dashboard shows YOUR tenant's data

### Data Isolation
- Each tenant has separate: `tenantname_xxx` database
- Complete API isolation with tenant-specific API keys
- Usage limits per tenant plan (Free/Pro/Enterprise)

---

## How It Works Without Subdomains

```
┌─────────────────────────────────────────┐
│  User visits: nexuserp.com              │
└────────────────┬────────────────────────┘
                 │
         ┌───────▼────────┐
         │  Login/Signup  │
         └───────┬────────┘
                 │
    ┌────────────▼──────────────┐
    │ Store tenant_subdomain    │
    │ in session cookie         │
    └────────────┬──────────────┘
                 │
      ┌──────────▼──────────────┐
      │  Middleware reads cookie│
      │  Routes to tenant site  │
      └──────────┬──────────────┘
                 │
    ┌────────────▼─────────────┐
    │  Your Custom Dashboard   │
    │  (Tenant-specific data)  │
    └──────────────────────────┘
```

---

## Future: Subdomain Setup (When Ready for Final Production)

### Prerequisites
1. Own a domain (e.g., `nexuserp.com`)
2. All features tested and ready
3. Ready for public launch

### Steps
1. **Configure DNS** (in your domain provider):
   ```
   A Record: nexuserp.com → 103.224.243.242
   A Record: *.nexuserp.com → 103.224.243.242
   ```

2. **Uncomment subdomain block in Nginx**:
   ```bash
   sudo nano /etc/nginx/sites-available/nexus-erp
   # Uncomment the *.nexuserp.com server block
   sudo nginx -t
   sudo systemctl restart nginx
   ```

3. **Install SSL certificates**:
   ```bash
   sudo certbot --nginx -d nexuserp.com -d *.nexuserp.com
   ```

4. **Update signup URLs**:
   - Change `dashboardUrl: '/dashboard'` to `http://${subdomain}.nexuserp.com/dashboard`
   - Update `site_url` in tenant creation

5. **Test subdomain access**:
   - `https://acme.nexuserp.com` → ACME tenant
   - `https://testco.nexuserp.com` → TestCo tenant

---

## Monitoring & Maintenance

### Logs
```bash
# Next.js logs
pm2 logs nexus-erp

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# ERPNext logs
cd ~/frappe_docker
docker compose logs -f backend
```

### Updates
```bash
# Pull latest code
cd ~/nexus_web
git pull origin main

# Install dependencies
npm install

# Rebuild
npm run build

# Restart
pm2 restart nexus-erp
```

### Backup
```bash
# Backup ERPNext sites
cd ~/frappe_docker
docker compose exec backend bench --site [site-name] backup

# Backup files are in: ~/frappe_docker/sites/[site-name]/private/backups/
```

---

## Troubleshooting

### App won't start
```bash
pm2 logs nexus-erp --lines 100
# Check for build errors or missing env vars
```

### Nginx 502 Bad Gateway
```bash
# Check if Next.js is running
pm2 status
# Check port 3000
sudo netstat -tlnp | grep 3000
```

### Tenant not found
```bash
# Check Tenant DocType exists in master site
cd ~/frappe_docker
docker compose exec backend bench --site [master-site] console
>>> frappe.get_all('Tenant', fields=['*'])
```

---

## Current Status

✅ **Ready for production use (single domain)**
✅ **Full multi-tenancy working**
✅ **Complete data isolation**
✅ **Usage limits enforced**
✅ **Team management enabled**
✅ **Can continue development without interruption**

⏳ **DNS subdomains**: Optional, add when ready for final production launch
