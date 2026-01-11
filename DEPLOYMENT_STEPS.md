# Deployment Steps for Your Setup

Your Frappe is running on: **ubuntu@erpdemo1** in Docker containers

## Step 1: Copy Provisioning Script to Server

### Option A: Using SCP (Recommended)
```bash
# From your Windows machine, copy the script to the server
scp C:\Users\Vedant` Singh` Thakur\Downloads\nexus_erp\scripts\provision-site-production.sh ubuntu@erpdemo1:~/provision-tenant.sh
```

### Option B: Using Copy-Paste
```bash
# 1. SSH into your server
ssh ubuntu@erpdemo1

# 2. Create the script file
nano ~/provision-tenant.sh

# 3. Copy the entire contents of scripts/provision-site-production.sh
# 4. Paste into nano, then press Ctrl+X, Y, Enter to save

# 5. Make it executable
chmod +x ~/provision-tenant.sh
```

## Step 2: Find the Frappe Backend Container

```bash
# SSH into server
ssh ubuntu@erpdemo1

# List Frappe containers
cd ~/frappe_docker
docker ps --filter "name=frappe"

# You should see: frappe_docker-backend-1
```

## Step 3: Test the Provisioning Script

```bash
# Execute script inside the backend container
docker exec -it frappe_docker-backend-1 bash -c "cd /home/frappe/frappe-bench && bash /workspace/provision-tenant.sh test123 admin@test.com Pass@123"
```

**Note**: You may need to adjust the path. First check where bench is:

```bash
# Find bench location
docker exec -it frappe_docker-backend-1 which bench

# Find frappe-bench directory
docker exec -it frappe_docker-backend-1 ls -la /home/frappe/ || docker exec -it frappe_docker-backend-1 ls -la /workspace/
```

## Step 4: Copy Script INTO the Container

Once you know the correct path:

```bash
# Copy from server to container
docker cp ~/provision-tenant.sh frappe_docker-backend-1:/home/frappe/provision-tenant.sh

# Or if frappe is in /workspace:
docker cp ~/provision-tenant.sh frappe_docker-backend-1:/workspace/provision-tenant.sh

# Make it executable inside container
docker exec -it frappe_docker-backend-1 chmod +x /home/frappe/provision-tenant.sh
```

## Step 5: Test Provisioning

```bash
# Run test provisioning
docker exec -it frappe_docker-backend-1 bash -c "cd /home/frappe/frappe-bench && /home/frappe/provision-tenant.sh test999 admin@test999.com TestPass@123"
```

**Look for these success messages**:
```
✅ Site created successfully
🔑 Generating API keys for Administrator...
🔥 Warming up Administrator session to activate API keys...
Session initialized successfully
✅ API keys verified and active
```

## Step 6: Update provision.ts to Use New Script

You need to update how the Next.js app calls the provisioning script:

```typescript
// In app/actions/provision.ts
// Change the script path to match your setup

// If running Next.js on the same server:
const scriptPath = '/home/frappe/provision-tenant.sh'

// Or if calling via docker exec:
const command = `docker exec frappe_docker-backend-1 /home/frappe/provision-tenant.sh ${subdomain} ${adminEmail} ${tempPassword}`
```

## Step 7: Deploy Next.js App

### If Next.js runs on the SAME server (ubuntu@erpdemo1):

```bash
# SSH to server
ssh ubuntu@erpdemo1

# Navigate to your Next.js project
cd ~/nexus_erp  # or wherever you deploy it

# Install dependencies (if first time)
npm install

# Build production bundle
npm run build

# Start with PM2 (recommended)
npm install -g pm2
pm2 start npm --name "nexus-erp" -- start
pm2 save
pm2 startup  # Follow the instructions it gives

# OR start directly (not recommended for production)
npm start
```

### If Next.js runs on your Windows machine (development):

```bash
# In PowerShell on Windows
cd "C:\Users\Vedant Singh Thakur\Downloads\nexus_erp"

# Build and start
npm run build
npm start

# Access at: http://localhost:3000
```

## Step 8: Update Environment Variables

Make sure your `.env` or `.env.production` has:

```env
# Frappe server URL (from Next.js perspective)
ERP_NEXT_URL=http://erpdemo1:8080
# Or if Next.js is on same server:
ERP_NEXT_URL=http://127.0.0.1:8080

# Master site
MASTER_SITE_URL=http://master.localhost:8080
MASTER_API_KEY=your_master_api_key
MASTER_API_SECRET=your_master_api_secret
```

## Step 9: Test End-to-End Signup

1. Navigate to signup page: `http://your-app-url/signup`
2. Fill in organization details
3. Submit and watch the console logs
4. Should complete in 45-70 seconds
5. Should redirect to dashboard

## Troubleshooting

### Issue: "bench: command not found"
```bash
# Find where bench is installed in container
docker exec -it frappe_docker-backend-1 which bench
docker exec -it frappe_docker-backend-1 find / -name "bench" 2>/dev/null
```

### Issue: "Permission denied"
```bash
# Make script executable
docker exec -it frappe_docker-backend-1 chmod +x /home/frappe/provision-tenant.sh
```

### Issue: "Site already exists"
```bash
# Remove test site
docker exec -it frappe_docker-backend-1 bench drop-site test999.localhost --force
```

### Issue: Can't reach Frappe from Next.js
```bash
# Test connection from Next.js server
curl http://erpdemo1:8080/api/method/version

# Or from Windows PowerShell:
Invoke-WebRequest -Uri "http://erpdemo1:8080/api/method/version"
```

## Quick Command Reference

```bash
# SSH to server
ssh ubuntu@erpdemo1

# List containers
docker ps --filter "name=frappe"

# Access backend container
docker exec -it frappe_docker-backend-1 bash

# Inside container: List sites
bench --site all list-apps

# Inside container: Create test site
bench new-site test.localhost --admin-password admin --install-app erpnext

# Copy file to container
docker cp ~/file.sh frappe_docker-backend-1:/home/frappe/

# View container logs
docker logs frappe_docker-backend-1 --tail 100 -f
```

## Architecture Overview

```
┌─────────────────────────────────────┐
│  Your Windows Machine               │
│  - Next.js Dev Server (port 3000)  │
│  - VS Code                          │
└──────────────┬──────────────────────┘
               │ SSH/HTTP
               ▼
┌─────────────────────────────────────┐
│  ubuntu@erpdemo1 (Remote Server)    │
│  ┌─────────────────────────────┐   │
│  │ frappe_docker-backend-1      │   │
│  │ - bench commands             │   │
│  │ - provision-tenant.sh        │   │
│  │ - /home/frappe/frappe-bench  │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ frappe_docker-frontend-1     │   │
│  │ - Port 8080 exposed          │   │
│  │ - Nginx proxy                │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ frappe_docker-db-1           │   │
│  │ - MariaDB                    │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Next Steps After Deployment

1. ✅ Monitor first 5 test signups
2. ✅ Check provisioning time (should be 45-70s)
3. ✅ Verify API keys activate (should be 2-5s)
4. ✅ Check logs for any errors
5. ✅ Set up monitoring/alerts

## Production Recommendations

- [ ] Use PM2 for Next.js process management
- [ ] Set up Nginx reverse proxy with SSL
- [ ] Configure automated backups
- [ ] Set up log rotation
- [ ] Monitor disk space (grows with tenants)
- [ ] Set up health check endpoints
