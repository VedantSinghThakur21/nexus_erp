#!/bin/bash

# ============================================================
# Next.js Production Deployment Script
# ============================================================
# Usage: ./deploy-frontend.sh
# This script updates and redeploys the Next.js app with zero downtime
# ============================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Next.js Production Deployment${NC}"
echo "============================================"

# Configuration
APP_DIR="/home/ubuntu/nexus_web"
APP_NAME="nexus-erp"

# Navigate to application directory
cd "$APP_DIR" || exit 1
echo -e "${GREEN}✓${NC} Changed to directory: $APP_DIR"

# Step 1: Pull latest code from Git
echo ""
echo -e "${YELLOW}[1/6]${NC} Pulling latest code from Git..."
git fetch origin
git pull origin main
echo -e "${GREEN}✓${NC} Code updated from repository"

# Step 2: Install dependencies
echo ""
echo -e "${YELLOW}[2/6]${NC} Installing dependencies..."
npm install --legacy-peer-deps --production=false
echo -e "${GREEN}✓${NC} Dependencies installed"

# Step 3: Build the Next.js application
echo ""
echo -e "${YELLOW}[3/6]${NC} Building Next.js application..."
npm run build
echo -e "${GREEN}✓${NC} Build completed successfully"

# Step 4: Create logs directory if it doesn't exist
echo ""
echo -e "${YELLOW}[4/6]${NC} Setting up logs directory..."
mkdir -p logs
echo -e "${GREEN}✓${NC} Logs directory ready"

# Step 5: Reload PM2 with zero downtime
echo ""
echo -e "${YELLOW}[5/6]${NC} Reloading PM2 (zero downtime)..."
pm2 reload ecosystem.config.js --update-env
echo -e "${GREEN}✓${NC} PM2 reloaded successfully"

# Step 6: Save PM2 configuration
echo ""
echo -e "${YELLOW}[6/6]${NC} Saving PM2 configuration..."
pm2 save
echo -e "${GREEN}✓${NC} PM2 configuration saved"

# Show application status
echo ""
echo "============================================"
echo -e "${GREEN}✅ Deployment Completed Successfully!${NC}"
echo ""
echo "Application Status:"
pm2 list
echo ""
echo "Recent Logs (last 20 lines):"
pm2 logs "$APP_NAME" --lines 20 --nostream

echo ""
echo -e "${GREEN}🎉 Your application is now running in production mode${NC}"
echo ""
echo "Useful Commands:"
echo "  - View logs:     pm2 logs $APP_NAME"
echo "  - Monitor:       pm2 monit"
echo "  - Restart:       pm2 restart $APP_NAME"
echo "  - Stop:          pm2 stop $APP_NAME"
echo ""
