# Production Deployment Checklist

## Pre-Deployment

### 1. Database & API Keys
- [ ] Verify master site database name in Frappe
- [ ] Generate fresh API keys for Administrator user in master database:
  ```sql
  -- Connect to master database
  docker compose exec db mariadb -uroot -p<password>
  
  -- Show databases to find master (e.g., _73c82ec6d255ebe3)
  SHOW DATABASES;
  
  -- Use master database
  USE _<master_db_name>;
  
  -- Update API keys for Administrator
  UPDATE tabUser 
  SET api_key = '<new_key>',
      api_secret = '<new_secret>'
  WHERE name = 'Administrator';
  
  -- Verify
  SELECT name, api_key, api_secret FROM tabUser WHERE name = 'Administrator';
  ```

### 2. Environment Configuration
- [ ] Update `.env.local` on **Ubuntu server** (~/nexus_web/.env.local):
  ```env
  # ERPNext Backend
  ERP_NEXT_URL=http://127.0.0.1:8080
  ERP_API_KEY=<from_database>
  ERP_API_SECRET=<from_database>
  
  # Public URL
  NEXT_PUBLIC_ERP_NEXT_URL=http://127.0.0.1:8080
  
  # Provisioning
  MOCK_PROVISIONING=false
  PROVISION_SCRIPT_PATH=/home/ubuntu/frappe_docker/custom_scripts/provision-site-simple.sh
  DOCKER_COMPOSE_PATH=/home/ubuntu/frappe_docker
  BACKEND_CONTAINER=backend
  ```

- [ ] Verify API keys match between `.env.local` and database

### 3. Code Deployment
- [ ] Push latest code to Git repository
- [ ] SSH to Ubuntu server and pull latest code:
  ```bash
  cd ~/nexus_web
  git pull origin main
  npm install
  npm run build
  ```

## Deployment Steps

### 1. Start/Restart Services
```bash
# Restart Next.js with PM2
pm2 restart nexus-erp

# Or start for the first time
pm2 start ecosystem.config.js
pm2 save

# Verify running
pm2 status
pm2 logs nexus-erp --lines 50
```

### 2. Verify Nginx Configuration
```bash
# Test Nginx config
sudo nginx -t

# Restart if needed
sudo systemctl restart nginx
sudo systemctl status nginx
```

### 3. Check Frappe/ERPNext is Running
```bash
cd ~/frappe_docker
docker compose ps

# Should show backend, db, frontend, queue-* containers running
```

## Post-Deployment Testing

### 1. Test Master Site Authentication
```bash
# Test API keys work
curl -X GET 'http://127.0.0.1:8080/api/method/frappe.auth.get_logged_user' \
  -H 'Authorization: token <API_KEY>:<API_SECRET>' \
  -H 'Accept: application/json'

# Should return Administrator email
```

### 2. Test Tenant Provisioning Flow
1. [ ] Open browser to http://<your-domain>/signup
2. [ ] Fill signup form with test email
3. [ ] Submit and wait for provisioning
4. [ ] Check PM2 logs for provisioning status:
   ```bash
   pm2 logs nexus-erp --lines 100
   ```
5. [ ] Verify tenant created in master database:
   ```sql
   USE _<master_db>;
   SELECT name, subdomain, site_url, status FROM tabTenant;
   ```

### 3. Test Tenant Login
1. [ ] Navigate to /login
2. [ ] Enter tenant email and password
3. [ ] Should redirect to /dashboard
4. [ ] Verify cookies are set:
   - `sid` (session ID)
   - `user_email`
   - `tenant_subdomain`
   - `user_type` = "tenant"

### 4. Test Dashboard Data Loading
1. [ ] Dashboard should load without errors
2. [ ] Check browser console for errors
3. [ ] Verify API calls include `X-Frappe-Site-Name` header
4. [ ] Empty data should show gracefully (zeros, empty lists)

### 5. Test Settings Page
1. [ ] Navigate to /settings
2. [ ] Profile should show or display "Please log in" message
3. [ ] No console errors

## Troubleshooting

### Issue: 401 Authentication Errors
**Cause**: API keys don't match between .env and database

**Fix**:
1. Verify keys in database match .env.local:
   ```bash
   # On server
   cat ~/nexus_web/.env.local | grep ERP_API
   
   # In database
   docker compose exec db mariadb -uroot -p<password> -e \
     "USE _<master_db>; SELECT api_key, api_secret FROM tabUser WHERE name='Administrator';"
   ```
2. Update either file to match
3. Restart Next.js: `pm2 restart nexus-erp`

### Issue: "No logged-in user found in cookies"
**Cause**: Session cookie not set or expired

**Fix**:
1. Clear browser cookies
2. Log in again
3. Check middleware is setting cookies correctly
4. Verify `X-Frappe-Site-Name` header is included in requests

### Issue: Tenant provisioning fails
**Cause**: Script path wrong or Docker not running

**Fix**:
1. Verify provision script exists:
   ```bash
   ls -la /home/ubuntu/frappe_docker/custom_scripts/provision-site-simple.sh
   ```
2. Check Docker containers running:
   ```bash
   docker compose ps
   ```
3. Check PM2 logs for detailed error:
   ```bash
   pm2 logs nexus-erp --lines 200
   ```

### Issue: Tenant can't access their data
**Cause**: `X-Frappe-Site-Name` header missing

**Solution**: Already fixed in latest code. Update:
```bash
cd ~/nexus_web
git pull origin main
npm run build
pm2 restart nexus-erp
```

## Monitoring

### Check Logs
```bash
# Next.js logs
pm2 logs nexus-erp --lines 100

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# ERPNext logs
cd ~/frappe_docker
docker compose logs backend --tail=100 -f
```

### Monitor Performance
```bash
# PM2 monitoring dashboard
pm2 monit

# Server resources
htop

# Disk usage
df -h
```

## Backup Procedures

### Database Backup
```bash
# Backup all Frappe databases
cd ~/frappe_docker
docker compose exec db sh -c 'mysqldump -uroot -p<password> --all-databases' > backup_$(date +%Y%m%d).sql
```

### Code Backup
```bash
# Commit and push all changes
cd ~/nexus_web
git add .
git commit -m "Backup $(date +%Y-%m-%d)"
git push origin main
```

## Security Checklist
- [ ] Change default MariaDB root password
- [ ] Use strong API keys (regenerate regularly)
- [ ] Enable HTTPS with SSL certificate (Let's Encrypt)
- [ ] Configure firewall (UFW) to only allow necessary ports
- [ ] Set `NODE_ENV=production` in .env
- [ ] Disable error stack traces in production
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`

## Next Steps for Full Production

### 1. SSL Certificate (HTTPS)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com
```

### 2. Custom Domain Setup
1. Point domain A record to server IP
2. Update nginx config with domain name
3. Update `NEXT_PUBLIC_ERP_NEXT_URL` in .env
4. Get SSL certificate

### 3. Monitoring & Alerts
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Configure PM2 alerts: `pm2 install pm2-logrotate`
- Set up error tracking (Sentry)

### 4. Performance Optimization
- Enable Next.js caching
- Configure Redis for session storage
- Set up CDN for static assets
- Database query optimization

## Support Contacts
- ERPNext/Frappe: https://discuss.frappe.io
- Next.js: https://nextjs.org/docs
- PM2: https://pm2.keymetrics.io/docs

---

**Last Updated**: 2026-01-08
**Version**: 1.0
