#!/bin/bash

# Nexus ERP Production Deployment Script
# Usage: ./deploy.sh

set -e  # Exit on error

echo "🚀 Starting Nexus ERP Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="$HOME/nexus_web"
FRAPPE_DIR="$HOME/frappe_docker"

# Step 1: Pull latest code
echo -e "${YELLOW}📥 Pulling latest code from Git...${NC}"
cd "$APP_DIR"
git pull origin main

# Step 2: Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Step 3: Build Next.js
echo -e "${YELLOW}🔨 Building Next.js application...${NC}"
npm run build

# Step 4: Restart PM2
echo -e "${YELLOW}♻️  Restarting PM2 process...${NC}"
pm2 restart nexus-erp || pm2 start ecosystem.config.js
pm2 save

# Step 5: Check Frappe Docker
echo -e "${YELLOW}🐳 Checking Frappe Docker containers...${NC}"
cd "$FRAPPE_DIR"
docker compose ps

# Step 6: Restart Nginx
echo -e "${YELLOW}🌐 Restarting Nginx...${NC}"
sudo nginx -t && sudo systemctl restart nginx

# Step 7: Show status
echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "📊 PM2 Status:"
pm2 status
echo ""
echo "📝 View logs with: pm2 logs nexus-erp"
echo "🔍 Monitor with: pm2 monit"
echo ""
echo -e "${GREEN}🎉 Nexus ERP is now running!${NC}"
