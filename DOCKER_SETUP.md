# Docker-Specific Configuration Guide

## Your Current Setup

- **Frappe Server**: `ubuntu@erpdemo1` (remote server)
- **Docker Containers**: frappe_docker-backend-1, frappe_docker-frontend-1, etc.
- **Frontend Port**: 8080 (http://erpdemo1:8080)
- **Next.js**: Running locally on Windows (or will be deployed)

## Configuration Steps

### 1. Create Docker-Aware Provisioning Wrapper

Since your Frappe runs in Docker, you need a wrapper script that calls the provisioning script inside the container.

**On the server (ubuntu@erpdemo1)**, create this wrapper:

```bash
# SSH to server
ssh ubuntu@erpdemo1

# Create wrapper script
cat > ~/provision-tenant-docker.sh << 'EOF'
#!/bin/bash

# Docker wrapper for tenant provisioning
# This script runs on the host and executes provisioning inside the container

SUBDOMAIN=$1
ADMIN_EMAIL=$2
TEMP_PASSWORD=$3

if [ -z "$SUBDOMAIN" ] || [ -z "$ADMIN_EMAIL" ] || [ -z "$TEMP_PASSWORD" ]; then
    echo "Usage: $0 <subdomain> <admin-email> <password>"
    exit 1
fi

echo "🚀 Starting Docker provisioning for: $SUBDOMAIN"

# Copy provisioning script into container if not already there
docker cp ~/provision-tenant.sh frappe_docker-backend-1:/home/frappe/provision-tenant.sh 2>/dev/null || true

# Execute provisioning inside backend container
docker exec -i frappe_docker-backend-1 bash -c "
    cd /home/frappe/frappe-bench
    chmod +x /home/frappe/provision-tenant.sh
    /home/frappe/provision-tenant.sh '$SUBDOMAIN' '$ADMIN_EMAIL' '$TEMP_PASSWORD'
"

exit $?
EOF

# Make it executable
chmod +x ~/provision-tenant-docker.sh
```

### 2. Test the Docker Wrapper

```bash
# Test provisioning through Docker
~/provision-tenant-docker.sh test888 admin@test888.com TestPass@123
```

**Expected output**:
```
🚀 Starting Docker provisioning for: test888
============================================================
🚀 Starting provisioning for: test888.localhost
============================================================
📦 Creating new site...
✅ Site created successfully
🔑 Generating API keys for Administrator...
🔥 Warming up Administrator session to activate API keys...
Session initialized successfully
✅ Verifying API keys are active...
✅ API keys verified and active
...
```

### 3. Configure Environment Variables

Create `.env.production` in your Next.js project:

```bash
# On Windows in your project directory
# C:\Users\Vedant Singh Thakur\Downloads\nexus_erp\.env.production

# Frappe server (from Next.js perspective)
ERP_NEXT_URL=http://erpdemo1:8080
# Or use IP if DNS doesn't work:
# ERP_NEXT_URL=http://103.224.243.242:8080

# Master site credentials (get these from your master site)
MASTER_SITE_URL=http://master.localhost:8080
MASTER_API_KEY=your_master_api_key_here
MASTER_API_SECRET=your_master_api_secret_here

# Provisioning script (use the Docker wrapper)
PROVISION_SCRIPT_PATH=/home/ubuntu/provision-tenant-docker.sh

# Production mode (not mock)
MOCK_PROVISIONING=false

# Next.js
NEXTAUTH_URL=http://your-domain-or-ip:3000
NEXTAUTH_SECRET=your-secure-random-string-here
```

### 4. Update provision.ts for Docker Setup

The script path needs to point to your Docker wrapper:

```typescript
// In app/actions/provision.ts, line 88:
const scriptPath = process.env.PROVISION_SCRIPT_PATH || '/home/ubuntu/provision-tenant-docker.sh'
```

**Already correct!** Just make sure your `.env.production` has:
```
PROVISION_SCRIPT_PATH=/home/ubuntu/provision-tenant-docker.sh
```

### 5. SSH Setup for Next.js → Server Communication

If Next.js runs on a different machine than Frappe, you need to enable SSH command execution:

#### Option A: SSH from Next.js (if on separate machine)

Create a new wrapper that uses SSH:

```typescript
// Add to app/actions/provision.ts

// For remote Docker execution via SSH
const isRemoteServer = process.env.FRAPPE_SERVER_HOST && process.env.FRAPPE_SERVER_HOST !== 'localhost'

if (isRemoteServer) {
  const host = process.env.FRAPPE_SERVER_HOST // 'ubuntu@erpdemo1'
  const scriptPath = process.env.PROVISION_SCRIPT_PATH || '/home/ubuntu/provision-tenant-docker.sh'
  
  const child = spawn('ssh', [
    host,
    scriptPath,
    subdomain,
    adminEmail,
    adminPassword
  ])
  // ... rest of the code
}
```

Add to `.env.production`:
```
FRAPPE_SERVER_HOST=ubuntu@erpdemo1
```

#### Option B: Deploy Next.js on Same Server (Recommended)

Deploy Next.js to the same server as Frappe:

```bash
# SSH to server
ssh ubuntu@erpdemo1

# Clone your Next.js project
cd ~
git clone <your-repo-url> nexus_erp
cd nexus_erp

# Install dependencies
npm install

# Build
npm run build

# Start with PM2
npm install -g pm2
pm2 start npm --name "nexus-erp" -- start
pm2 save
pm2 startup
```

Then scripts can execute locally without SSH.

### 6. Get Master Site API Keys

You need API keys from your master Frappe site:

```bash
# SSH to server
ssh ubuntu@erpdemo1

# Access backend container
docker exec -it frappe_docker-backend-1 bash

# Inside container, open bench console
cd /home/frappe/frappe-bench
bench --site master.localhost console

# In Python console, generate API keys:
from frappe.core.doctype.user.user import generate_keys
generate_keys('Administrator')
frappe.db.commit()

# Get the keys:
user = frappe.get_doc('User', 'Administrator')
print(f"API Key: {user.api_key}")
print(f"API Secret: {frappe.utils.password.get_decrypted_password('User', 'Administrator', fieldname='api_secret')}")

# Copy these and exit
exit()
exit
```

Update your `.env.production` with these keys.

### 7. Test Configuration

```bash
# On Windows PowerShell
cd "C:\Users\Vedant Singh Thakur\Downloads\nexus_erp"

# Test connection to Frappe
Invoke-WebRequest -Uri "http://erpdemo1:8080/api/method/version" -UseBasicParsing

# Or if that doesn't work, use IP:
Invoke-WebRequest -Uri "http://103.224.243.242:8080/api/method/version" -UseBasicParsing
```

## Deployment Scenarios

### Scenario 1: Next.js on Windows (Development)

```
┌──────────────────┐         HTTP/SSH          ┌────────────────────┐
│  Windows PC      │─────────────────────────▶│  ubuntu@erpdemo1   │
│  - Next.js :3000 │                           │  - Docker Frappe   │
│  - VS Code       │                           │  - Port 8080       │
└──────────────────┘                           └────────────────────┘
```

**Pros**: Easy development, local IDE
**Cons**: Need SSH access for provisioning, slower network

**Setup**:
- Use SSH command execution in provision.ts
- Set `FRAPPE_SERVER_HOST=ubuntu@erpdemo1`
- Set up SSH key authentication (no password prompts)

### Scenario 2: Next.js on Same Server (Production)

```
┌─────────────────────────────────────┐
│  ubuntu@erpdemo1                    │
│  ┌──────────────┐  ┌─────────────┐ │
│  │ Next.js      │  │ Docker      │ │
│  │ Port 3000    │──│ Frappe      │ │
│  │ (PM2)        │  │ Port 8080   │ │
│  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────┘
```

**Pros**: Fast, no SSH needed, production-ready
**Cons**: Need to deploy Next.js to server

**Setup**:
- Deploy Next.js to server with PM2
- Use local script execution (no SSH)
- Use `localhost` or `127.0.0.1` for ERP_NEXT_URL

### Scenario 3: Separate Production Servers

```
┌──────────────────┐         HTTP          ┌────────────────────┐
│  App Server      │─────────────────────▶│  Frappe Server     │
│  - Next.js       │◀─────────────────────│  - Docker          │
│  - Nginx         │         SSH           │  - Load Balancer   │
└──────────────────┘                       └────────────────────┘
```

**Pros**: Scalable, isolated services
**Cons**: More complex setup

## Quick Start Commands

### For Development (Windows → Server)

```powershell
# 1. Copy provisioning scripts to server
scp scripts\provision-site-production.sh ubuntu@erpdemo1:~/provision-tenant.sh

# 2. Create Docker wrapper (see Step 1 above)

# 3. Configure .env.production (see Step 3)

# 4. Start Next.js
npm run dev

# 5. Test signup at http://localhost:3000/signup
```

### For Production (On Server)

```bash
# 1. SSH to server
ssh ubuntu@erpdemo1

# 2. Deploy Next.js
git clone <repo> ~/nexus_erp
cd ~/nexus_erp
npm install
npm run build

# 3. Start with PM2
pm2 start npm --name "nexus-erp" -- start
pm2 save

# 4. Access at http://erpdemo1:3000
```

## Troubleshooting

### Can't reach Frappe from Next.js

```bash
# Test from server
ssh ubuntu@erpdemo1
curl http://localhost:8080/api/method/version

# Test from Windows
curl http://erpdemo1:8080/api/method/version
```

### Provisioning script fails

```bash
# Check Docker container status
ssh ubuntu@erpdemo1
docker ps --filter "name=frappe"

# Test provisioning directly
docker exec -it frappe_docker-backend-1 bash
cd /home/frappe/frappe-bench
bench new-site test.localhost --admin-password admin
```

### SSH timeouts

```bash
# Set up SSH key authentication
ssh-keygen -t rsa
ssh-copy-id ubuntu@erpdemo1

# Test passwordless SSH
ssh ubuntu@erpdemo1 "echo 'SSH works'"
```

## Next Steps

1. ✅ Copy scripts to server
2. ✅ Create Docker wrapper
3. ✅ Test provisioning
4. ✅ Configure environment variables
5. ✅ Deploy Next.js (dev or production)
6. ✅ Test end-to-end signup
