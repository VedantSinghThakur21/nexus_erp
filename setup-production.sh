#!/bin/bash

# ============================================================
# Production Deployment Setup for Next.js on Ubuntu VPS
# ============================================================
# Run this script ONCE to set up the production environment
# After this, use deploy-frontend.sh for updates
# ============================================================

set -e  # Exit on any error

echo "🚀 Setting up Next.js Production Environment"
echo "============================================"
echo ""

# Step 1: Update system packages
echo "[1/8] Updating system packages..."
sudo apt update && sudo apt upgrade -y
echo "✓ System updated"
echo ""

# Step 2: Install Node.js (if not already installed)
echo "[2/8] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "✓ Node.js already installed ($(node -v))"
fi
echo ""

# Step 3: Install PM2 globally
echo "[3/8] Installing PM2..."
sudo npm install -g pm2
echo "✓ PM2 installed ($(pm2 -v))"
echo ""

# Step 4: Install Nginx
echo "[4/8] Installing Nginx..."
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
echo "✓ Nginx installed and running"
echo ""

# Step 5: Navigate to project directory
echo "[5/8] Setting up application..."
cd /home/ubuntu/nexus_web || exit 1
echo "✓ In project directory"
echo ""

# Step 6: Install dependencies and build
echo "[6/8] Installing dependencies and building..."
npm install --legacy-peer-deps
npm run build
mkdir -p logs
echo "✓ Application built"
echo ""

# Step 7: Configure Nginx
echo "[7/8] Configuring Nginx..."
# Disable IPv6 in main nginx.conf
sudo sed -i 's/listen \[::\]:80/# listen [::]:80/g' /etc/nginx/nginx.conf
sudo sed -i 's/listen \[::\]:443/# listen [::]:443/g' /etc/nginx/nginx.conf
# Copy our config
sudo cp nginx-nexus-erp.conf /etc/nginx/sites-available/nexus-erp
sudo ln -sf /etc/nginx/sites-available/nexus-erp /etc/nginx/sites-enabled/nexus-erp
sudo rm -f /etc/nginx/sites-enabled/default  # Remove default site
sudo rm -f /etc/nginx/sites-enabled/nexus    # Remove old config if exists
sudo nginx -t
sudo systemctl reload nginx
echo "✓ Nginx configured"
echo ""

# Step 8: Start application with PM2
echo "[8/8] Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu
echo "✓ Application started"
echo ""

echo "============================================"
echo "✅ Production Setup Complete!"
echo ""
echo "Your Next.js app is now running at:"
echo "  - http://$(curl -s ifconfig.me)"
echo "  - http://localhost:3000"
echo ""
echo "Next Steps:"
echo "1. Point your domain DNS to this server's IP"
echo "2. Update nginx-nexus.conf: Replace 'server_name _' with 'server_name app.avariq.com'"
echo "3. Run: sudo systemctl reload nginx"
echo "4. (Optional) Set up SSL with: sudo certbot --nginx -d app.avariq.com"
echo ""
echo "Useful Commands:"
echo "  - View logs:        pm2 logs nexus-erp"
echo "  - Monitor:          pm2 monit"
echo "  - Deploy updates:   ./deploy-frontend.sh"
echo "  - Restart app:      pm2 restart nexus-erp"
echo ""
