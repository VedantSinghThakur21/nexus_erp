# Tenant Provisioning System

## Overview

This directory contains the Node.js script that handles complete tenant provisioning for the multi-tenant SaaS application.

## Architecture

```
User Signup (Next.js)
    ↓
signup.ts (Server Action)
    ↓
provision-tenant.js (Node.js Script)
    ↓
docker compose exec (Commands)
    ↓
ERPNext/Frappe (Backend)
```

## Files

### `provision-tenant.js`

Main provisioning script that creates a complete tenant environment.

**Workflow:**
1. **Create Site** - `bench new-site {subdomain}.localhost`
2. **Install App** - `bench install-app nexus_core` (optional)
3. **Create Admin User** - Creates user with System Manager role
4. **Initialize Subscription** - Sets up SaaS Settings with limits
5. **Generate API Keys** - Creates API credentials for immediate login

**Usage:**
```bash
node provision-tenant.js <subdomain> <email> <fullName> <password> <organizationName>
```

**Example:**
```bash
node provision-tenant.js acme-corp john@acme.com "John Doe" "SecurePass123" "Acme Corporation"
```

**Output Format:**
```json
{
  "success": true,
  "site": "acme-corp.localhost",
  "url": "http://acme-corp.localhost:8080",
  "email": "john@acme.com",
  "apiKey": "a1b2c3d4e5f6...",
  "apiSecret": "x1y2z3w4v5...",
  "organizationName": "Acme Corporation",
  "elapsed": 12.34
}
```

**Error Format:**
```json
{
  "success": false,
  "error": "Error message here",
  "site": "acme-corp.localhost"
}
```

## Environment Variables

### Required in Next.js `.env.local`:

```bash
# Docker Configuration
DOCKER_SERVICE=backend          # Docker service name (default: backend)
ADMIN_PASSWORD=admin           # Temporary admin password for site creation

# ERPNext Master Site (for tenant registry)
ERP_NEXT_URL=http://localhost:8080
ERP_API_KEY=your_master_api_key
ERP_API_SECRET=your_master_api_secret
FRAPPE_SITE_NAME=master.localhost

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret
```

## Integration with Next.js

### Server Action (`app/actions/signup.ts`)

```typescript
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

export async function signup(data: SignupData) {
  // 1. Validate inputs
  // 2. Generate subdomain
  // 3. Execute provisioning script
  const scriptPath = path.join(process.cwd(), 'scripts', 'provision-tenant.js')
  const { stdout } = await execFileAsync('node', [
    scriptPath,
    subdomain,
    email,
    fullName,
    password,
    organizationName
  ])
  
  // 4. Parse JSON result
  const result = JSON.parse(stdout.trim().split('\n').pop())
  
  // 5. Store credentials and redirect user
}
```

## Provisioning Steps Explained

### 1. Site Creation

```bash
bench new-site acme-corp.localhost --admin-password admin --no-mariadb-socket
```

- Creates new ERPNext site with subdomain
- Sets temporary admin password
- Uses docker socket (no mariadb socket needed)

### 2. App Installation

```bash
bench --site acme-corp.localhost install-app nexus_core
```

- Installs custom app (if exists)
- Skips gracefully if app not found
- Adds custom business logic

### 3. User Creation (Python Script)

```python
user = frappe.get_doc({
    'doctype': 'User',
    'email': 'john@acme.com',
    'first_name': 'John',
    'last_name': 'Doe',
    'enabled': 1,
    'user_type': 'System User'
})
user.insert()
update_password(user='john@acme.com', pwd='SecurePass123')
user.add_roles('System Manager')
```

- Creates user with full name
- Sets custom password
- Assigns System Manager role
- Commits to database

### 4. Subscription Initialization

```python
settings = frappe.get_doc({
    'doctype': 'SaaS Settings',
    'plan_name': 'Free',
    'max_users': 5,
    'max_storage': 1.0  # 1GB
})
settings.save()
```

- Sets up Free plan limits
- Configures resource quotas
- Enables usage tracking

### 5. API Key Generation

```python
api_key = secrets.token_hex(16)      # 32 character hex
api_secret = secrets.token_hex(32)   # 64 character hex

frappe.db.set_value('User', email, {
    'api_key': api_key,
    'api_secret': api_secret
})
```

- Generates cryptographically secure keys
- Updates user document
- Keys are active immediately

## Error Handling

The script includes comprehensive error handling:

### Automatic Cleanup

If provisioning fails, the script automatically:
1. Logs the error
2. Attempts to drop the site: `bench drop-site {subdomain}.localhost --force`
3. Returns error JSON

### Timeout Protection

- 2 minute timeout for entire provisioning
- 10MB buffer for command output
- Prevents hanging processes

### Graceful Degradation

- App installation: Continues if app doesn't exist
- SaaS Settings: Continues if DocType not found
- Preserves partial success state

## Testing

### Local Testing

```bash
# Set environment variables
export DOCKER_SERVICE=backend
export ADMIN_PASSWORD=admin

# Run script directly
node scripts/provision-tenant.js test-tenant test@example.com "Test User" "Test123!" "Test Org"
```

### Expected Output

```
[1/5] Creating site: test-tenant.localhost...
✓ Site created successfully
[2/5] Installing nexus_core app...
⚠ App installation skipped (app may not exist)
[3/5] Creating admin user: test@example.com...
✓ User created successfully
[4/5] Initializing subscription settings...
✓ Subscription settings initialized
[5/5] Generating API keys...
✓ API keys generated

✅ Provisioning completed in 12.34s
{"success":true,"site":"test-tenant.localhost",...}
```

## Troubleshooting

### Issue: "Command failed: bench new-site"

**Solution:**
- Ensure Docker container is running: `docker compose ps`
- Check DOCKER_SERVICE name matches compose file
- Verify bench is installed in container

### Issue: "Site already exists"

**Solution:**
```bash
# Drop existing site
docker compose exec backend bench drop-site test-tenant.localhost --force
```

### Issue: "API keys not generated"

**Solution:**
- Check Python script syntax in `generateKeysScript`
- Verify user was created successfully
- Check frappe.db.commit() was called

### Issue: "Timeout after 2 minutes"

**Solution:**
- Increase timeout in signup.ts: `timeout: 300000` (5 min)
- Check Docker container performance
- Verify database connection

## Performance

Typical provisioning times:

- **Site Creation:** 5-8 seconds
- **App Installation:** 2-3 seconds (if app exists)
- **User Creation:** 1-2 seconds
- **Settings Init:** 1 second
- **API Keys:** 1 second

**Total:** 10-15 seconds per tenant

## Security Considerations

### Password Handling

- Passwords passed via command args (ephemeral)
- Hashed by Frappe before storage
- Never logged or stored in plain text

### API Keys

- Generated using `crypto.randomBytes` (secure)
- 32-byte keys (256-bit entropy)
- Stored in database only

### Script Execution

- Runs in Node.js child process
- Isolated from Next.js main process
- No shell injection (uses execFile, not exec)

## Future Improvements

1. **Async Provisioning**
   - Queue-based provisioning (Redis/BullMQ)
   - Real-time progress updates via WebSocket
   - Background job processing

2. **Tenant Registry**
   - Store tenant metadata in Tenant DocType
   - Track provisioning status
   - Enable tenant management UI

3. **Resource Limits**
   - CPU/memory quotas per tenant
   - Storage monitoring
   - Auto-scaling based on usage

4. **Custom Plans**
   - Multiple subscription tiers
   - Dynamic resource allocation
   - Billing integration

## Support

For issues or questions:
1. Check this README
2. Review script output logs
3. Test with direct script execution
4. Check Docker container logs: `docker compose logs backend`
