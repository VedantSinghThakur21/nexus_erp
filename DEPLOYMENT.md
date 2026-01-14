# 🚀 Production Deployment Guide

Complete guide to deploy your Next.js application on Ubuntu VPS with PM2 and Nginx.

---

## 📋 Prerequisites

- Ubuntu VPS with sudo access
- Git repository set up
- Domain pointed to server IP (optional, can use IP initially)

---

## ⚡ Quick Start (One-Time Setup)

### Option 1: Automated Setup (Recommended)

```bash
# SSH into your VPS
ssh ubuntu@your-server-ip

# Navigate to your project
cd ~/nexus_web

# Make setup script executable
chmod +x setup-production.sh

# Run the automated setup
./setup-production.sh
```

This script will:
- Update system packages
- Install Node.js, PM2, and Nginx
- Build your Next.js application
- Configure Nginx reverse proxy
- Start your app with PM2
- Enable auto-start on system reboot

---

### Option 2: Manual Setup (Step-by-Step)

If you prefer to run commands manually:

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PM2 globally
sudo npm install -g pm2

# 4. Install Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# 5. Navigate to your project
cd ~/nexus_web

# 6. Install dependencies and build
npm install --legacy-peer-deps
npm run build
mkdir -p logs

# 7. Configure Nginx
sudo cp nginx-nexus.conf /etc/nginx/sites-available/nexus
sudo ln -sf /etc/nginx/sites-available/nexus /etc/nginx/sites-enabled/nexus
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 8. Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

---

## 🔄 Deploying Updates

After initial setup, use this script to deploy code updates:

```bash
# Make deploy script executable (first time only)
chmod +x deploy-frontend.sh

# Deploy updates
./deploy-frontend.sh
```

This automatically:
- Pulls latest code from Git
- Installs dependencies
- Builds the application
- Reloads PM2 with zero downtime
- Saves PM2 configuration

---

## 🌐 Domain Setup

### Point Your Domain

1. Add an A record in your DNS:
   ```
   Type: A
   Name: app (or @)
   Value: YOUR_SERVER_IP
   TTL: 3600
   ```

2. Update Nginx configuration:
   ```bash
   sudo nano /etc/nginx/sites-available/nexus
   ```

3. Change this line:
   ```nginx
   server_name _;
   ```
   To:
   ```nginx
   server_name app.avariq.com;
   ```

4. Test and reload:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## 🔒 SSL/HTTPS Setup (Let's Encrypt)

```bash
# 1. Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# 2. Get SSL certificate
sudo certbot --nginx -d app.avariq.com

# 3. Certbot will automatically:
#    - Get the certificate
#    - Update Nginx config
#    - Set up auto-renewal

# 4. Test auto-renewal
sudo certbot renew --dry-run
```

---

## 📊 Monitoring & Management

### PM2 Commands

```bash
# View application status
pm2 list

# View live logs
pm2 logs nexus-erp

# Monitor CPU/Memory
pm2 monit

# Restart application
pm2 restart nexus-erp

# Stop application
pm2 stop nexus-erp

# View detailed info
pm2 show nexus-erp

# Clear logs
pm2 flush
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload (graceful restart)
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# View status
sudo systemctl status nginx

# View access logs
sudo tail -f /var/log/nginx/nexus-access.log

# View error logs
sudo tail -f /var/log/nginx/nexus-error.log
```

---

## 🛠️ Troubleshooting

### App not starting?

```bash
# Check PM2 logs
pm2 logs nexus-erp --lines 50

# Check if port 3000 is in use
sudo netstat -tulpn | grep :3000

# Restart PM2
pm2 restart nexus-erp
```

### Nginx errors?

```bash
# Test config
sudo nginx -t

# Check error log
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Port 80 access denied?

```bash
# Check if Nginx is running
sudo systemctl status nginx

# Check if port 80 is open
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
```

### Build fails?

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install --legacy-peer-deps
npm run build
```

---

## 📁 File Structure

```
nexus_web/
├── ecosystem.config.js      # PM2 configuration
├── deploy-frontend.sh       # Deployment script
├── setup-production.sh      # One-time setup script
├── nginx-nexus.conf         # Nginx configuration
├── logs/                    # PM2 logs directory
│   ├── err.log             # Error logs
│   ├── out.log             # Output logs
│   └── combined.log        # Combined logs
└── .next/                   # Built application
```

---

## 🔐 Security Best Practices

1. **Firewall Setup:**
   ```bash
   sudo ufw enable
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   ```

2. **Regular Updates:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Environment Variables:**
   - Never commit `.env` files
   - Use PM2 ecosystem file for production env vars

4. **SSL Certificate:**
   - Always use HTTPS in production
   - Certificates auto-renew with Certbot

---

## 📈 Performance Optimization

Your setup includes:

- ✅ **Cluster Mode:** Uses all CPU cores
- ✅ **Zero Downtime Deployments:** PM2 reload
- ✅ **Static File Caching:** Nginx caches _next/static
- ✅ **Gzip Compression:** Nginx compresses responses
- ✅ **Keep-Alive Connections:** Reduces latency
- ✅ **Auto-Restart:** PM2 restarts on crashes

---

## 🆘 Need Help?

**View comprehensive logs:**
```bash
pm2 logs nexus-erp --lines 100
sudo tail -100 /var/log/nginx/nexus-error.log
```

**System resources:**
```bash
htop           # CPU/Memory usage
df -h          # Disk space
pm2 monit      # PM2 monitoring
```

---

## ✅ Checklist

- [ ] VPS with Ubuntu installed
- [ ] Node.js 18+ installed
- [ ] PM2 installed globally
- [ ] Nginx installed and running
- [ ] Application built successfully
- [ ] PM2 process running
- [ ] Nginx reverse proxy configured
- [ ] Domain DNS pointed to server
- [ ] SSL certificate installed (optional but recommended)
- [ ] Firewall configured
- [ ] Auto-start on reboot enabled

---

**Your Next.js app is now production-ready! 🎉**
