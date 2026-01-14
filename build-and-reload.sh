#!/bin/bash

# Post-Pull Build Script
# Run this after pulling latest code from git

set -e  # Exit on error

echo "🔄 Installing dependencies..."
npm install --legacy-peer-deps

echo "🏗️  Building application..."
npm run build

echo "♻️  Reloading PM2..."
pm2 reload nexus-erp

echo "✅ Deployment complete!"
pm2 logs nexus-erp --lines 20
