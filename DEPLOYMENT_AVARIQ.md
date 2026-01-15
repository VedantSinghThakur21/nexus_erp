# Nexus ERP - Avariq.in Deployment Guide
# Multi-Tenant Application with Wildcard DNS

## 🌐 DNS Configuration

Add these records to your DNS provider (GoDaddy, Namecheap, Cloudflare, etc.):

```
Type    Name    Value               TTL
A       @       103.224.243.242     3600
A       *       103.224.243.242     3600
A       www     103.224.243.242     3600
A       erp     103.224.243.242     3600
```

**What each record does:**
- `@` → avariq.in (main domain)
- `*` → *.avariq.in (all subdomains: tenant1.avariq.in, tenant2.avariq.in, etc.)
- `www` → www.avariq.in
- `erp` → erp.avariq.in (ERPNext admin panel)

## 📦 Deployment Steps

### 1. Upload Nginx Configuration

```bash
# On your local machine
scp nginx-avariq.conf ubuntu@103.224.243.242:/tmp/

# On server
sudo mv /tmp/nginx-avariq.conf /etc/nginx/sites-available/avariq.conf
sudo ln -sf /etc/nginx/sites-available/avariq.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Update Environment Variables

```bash
# On server
cd ~/nexus_web
nano .env.local
```

Update these values:
```bash
# Frontend URL
NEXT_PUBLIC_APP_URL=https://avariq.in

# ERPNext Backend
ERP_NEXT_URL=http://localhost:8080
NEXT_PUBLIC_ERPNEXT_URL=https://erp.avariq.in

# API Credentials (keep existing values)
ERP_API_KEY=your_existing_key
ERP_API_SECRET=your_existing_secret
```

### 3. Install SSL Certificates (Certbot)

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Get certificates for main domain
sudo certbot --nginx -d avariq.in -d www.avariq.in

# Get wildcard certificate (requires DNS validation)
sudo certbot certonly --manual --preferred-challenges dns -d avariq.in -d *.avariq.in

# Add ERPNext admin subdomain
sudo certbot --nginx -d erp.avariq.in
```

**For wildcard certificate:**
1. Certbot will ask you to add TXT record to DNS
2. Add: `_acme-challenge.avariq.in` TXT record with provided value
3. Wait 5 minutes for DNS propagation
4. Press Enter to continue

### 4. Update Nginx for SSL

After SSL certificates are issued, Certbot automatically updates Nginx config.

Verify SSL configuration:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Rebuild and Restart Application

```bash
cd ~/nexus_web
git pull origin main
npm install
npm run build
pm2 restart nexus_web
pm2 save
```

### 6. Update ERPNext Site Configuration

```bash
cd ~/frappe_docker
docker-compose exec backend bench set-config -g host_name "erp.avariq.in"
docker-compose restart backend
```

## 🧪 Testing

### Test Main Domain
```bash
curl -I https://avariq.in
curl -I https://www.avariq.in
```

### Test Subdomain (Tenant)
```bash
curl -I https://tenant1.avariq.in
curl -I https://avariq.avariq.in
```

### Test ERPNext Admin
```bash
curl -I https://erp.avariq.in
```

## 🔒 SSL Certificate Auto-Renewal

Certbot auto-renews certificates. Verify:
```bash
sudo certbot renew --dry-run
```

## 📊 Multi-Tenant URLs

After deployment:
- **Main App**: https://avariq.in
- **Tenant "acme"**: https://acme.avariq.in
- **Tenant "demo"**: https://demo.avariq.in
- **ERPNext Admin**: https://erp.avariq.in

## 🔧 Troubleshooting

### Check Nginx Status
```bash
sudo systemctl status nginx
sudo nginx -t
```

### Check DNS Propagation
```bash
nslookup avariq.in
nslookup tenant1.avariq.in
```

### Check SSL Certificates
```bash
sudo certbot certificates
```

### Check PM2 Logs
```bash
pm2 logs nexus_web --lines 50
```

### Check ERPNext Logs
```bash
cd ~/frappe_docker
docker-compose logs -f backend
```

## 🚀 Post-Deployment Checklist

- [ ] DNS records added and propagated (wait 5-15 minutes)
- [ ] Nginx configuration deployed
- [ ] SSL certificates installed
- [ ] Environment variables updated
- [ ] Application rebuilt and restarted
- [ ] ERPNext hostname configured
- [ ] Test main domain (https://avariq.in)
- [ ] Test wildcard subdomain (https://test.avariq.in)
- [ ] Test ERPNext admin (https://erp.avariq.in)
- [ ] Test signup flow
- [ ] Test login with username/email
- [ ] Test tenant isolation

## 📝 Notes

1. **DNS Propagation**: Can take 5 minutes to 24 hours
2. **Wildcard SSL**: Requires DNS validation (manual process)
3. **Subdomain Routing**: Handled by Next.js middleware based on `X-Tenant-Subdomain` header
4. **ERPNext**: Accessible only via erp.avariq.in for admin operations

## 🎉 Success Indicators

✅ https://avariq.in loads the login/signup page
✅ https://tenant1.avariq.in routes to tenant-specific app
✅ https://erp.avariq.in shows ERPNext login
✅ SSL padlock shows in browser
✅ No certificate warnings
✅ PM2 shows app running without errors
