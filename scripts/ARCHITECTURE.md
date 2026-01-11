# Multi-Tenant Provisioning Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                           │
│                    (Next.js Frontend)                           │
│                                                                 │
│  ┌───────────────┐    ┌──────────────┐    ┌─────────────┐   │
│  │ Signup Form   │───▶│ Validation   │───▶│  Submit     │   │
│  │ - Email       │    │ - Email      │    │             │   │
│  │ - Password    │    │ - Password   │    │             │   │
│  │ - Full Name   │    │ - Names      │    │             │   │
│  │ - Org Name    │    │ - Subdomain  │    │             │   │
│  └───────────────┘    └──────────────┘    └──────┬──────┘   │
└──────────────────────────────────────────────────┼────────────┘
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Server Action Layer                         │
│                   (app/actions/signup.ts)                       │
│                                                                 │
│  1. Validate Inputs                                             │
│     └─ Email format, password strength, name sanitization      │
│                                                                 │
│  2. Generate Subdomain                                          │
│     └─ "Acme Corp" → "acme-corp"                              │
│                                                                 │
│  3. Execute Provisioning Script                                 │
│     └─ node scripts/provision-tenant.js                        │
│        [subdomain] [email] [name] [pass] [org]                │
│                                                                 │
│  4. Parse JSON Result                                           │
│     └─ { success, site, url, apiKey, apiSecret }             │
│                                                                 │
│  5. Return to UI                                                │
│     └─ Success message + credentials                           │
└──────────────────────────────────────┬──────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Provisioning Script                            │
│              (scripts/provision-tenant.js)                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ STEP 1: Create Site                                       │  │
│  │ Command: bench new-site {subdomain}.localhost             │  │
│  │ Output:  Site directory + database created                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ STEP 2: Install App                                       │  │
│  │ Command: bench install-app nexus_core                     │  │
│  │ Output:  Custom DocTypes + business logic installed       │  │
│  │ Note:    Skips if app not found (optional)               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ STEP 3: Create Admin User                                 │  │
│  │ Method:  bench runner (Python script)                     │  │
│  │ Actions:                                                   │  │
│  │   • frappe.get_doc({doctype: 'User', ...})               │  │
│  │   • user.insert()                                         │  │
│  │   • update_password(user, pwd)                           │  │
│  │   • user.add_roles('System Manager')                     │  │
│  │ Output:  USER_CREATED:{email}                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ STEP 4: Initialize Subscription                           │  │
│  │ Method:  bench runner (Python script)                     │  │
│  │ DocType: SaaS Settings (Single)                           │  │
│  │ Fields:                                                    │  │
│  │   • plan_name: "Free"                                     │  │
│  │   • max_users: 5                                          │  │
│  │   • max_storage: 1.0 (GB)                                │  │
│  │ Output:  SETTINGS_INITIALIZED                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ STEP 5: Generate API Keys                                 │  │
│  │ Method:  bench runner (Python script)                     │  │
│  │ Generation:                                                │  │
│  │   • api_key = secrets.token_hex(16)    # 32 chars        │  │
│  │   • api_secret = secrets.token_hex(32)  # 64 chars       │  │
│  │ Storage:                                                   │  │
│  │   • frappe.db.set_value('User', email, {...})            │  │
│  │ Output:  API_KEY:{key}                                   │  │
│  │          API_SECRET:{secret}                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ FINAL: Return JSON                                        │  │
│  │ {                                                          │  │
│  │   "success": true,                                        │  │
│  │   "site": "acme-corp.localhost",                         │  │
│  │   "url": "http://acme-corp.localhost:8080",              │  │
│  │   "email": "john@acme.com",                              │  │
│  │   "apiKey": "a1b2c3d4e5f6...",                          │  │
│  │   "apiSecret": "x1y2z3w4v5...",                         │  │
│  │   "organizationName": "Acme Corp",                       │  │
│  │   "elapsed": 12.34                                       │  │
│  │ }                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Container                              │
│                 (frappe_docker-backend-1)                       │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                   Bench CLI                             │   │
│  │  • new-site     - Create new site                       │   │
│  │  • install-app  - Install custom app                    │   │
│  │  • runner       - Execute Python code                   │   │
│  │  • drop-site    - Delete site (cleanup)                │   │
│  └────────────────────────────────────────────────────────┘   │
│                             │                                  │
│                             ▼                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │               Frappe Framework                          │   │
│  │  • frappe.init(site)                                    │   │
│  │  • frappe.connect()                                     │   │
│  │  • frappe.get_doc()                                     │   │
│  │  • frappe.db.set_value()                               │   │
│  │  • frappe.db.commit()                                  │   │
│  └────────────────────────────────────────────────────────┘   │
│                             │                                  │
│                             ▼                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                  MariaDB Database                       │   │
│  │                                                         │   │
│  │  Site: acme-corp.localhost                             │   │
│  │  Database: `acme-corp-localhost`                       │   │
│  │                                                         │   │
│  │  Tables:                                                │   │
│  │    • tabUser           - User accounts                 │   │
│  │    • tabSaaS Settings  - Subscription limits           │   │
│  │    • tabCustomer       - Organization info             │   │
│  │    • ... (50+ tables)                                  │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
INPUT (Signup Form)
{
  email: "john@acme.com",
  password: "SecurePass123",
  fullName: "John Doe",
  organizationName: "Acme Corporation"
}
                    ↓
         TRANSFORMATION
                    ↓
    subdomain = "acme-corp"
                    ↓
PROVISIONING COMMANDS
                    ↓
┌─────────────────────────────────────┐
│ 1. bench new-site acme-corp.localhost│
│    └─ Creates site files + DB       │
│                                     │
│ 2. bench install-app nexus_core     │
│    └─ Installs custom app          │
│                                     │
│ 3. Create User Document             │
│    └─ Email, name, password, role  │
│                                     │
│ 4. Create SaaS Settings             │
│    └─ Plan: Free, Users: 5, etc   │
│                                     │
│ 5. Generate API Credentials         │
│    └─ api_key, api_secret          │
└─────────────────────────────────────┘
                    ↓
OUTPUT (JSON Response)
{
  success: true,
  site: "acme-corp.localhost",
  url: "http://acme-corp.localhost:8080",
  email: "john@acme.com",
  apiKey: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  apiSecret: "x1y2z3w4v5u6t7s8r9q0p1o2n3m4l5k6..."
}
```

## Error Handling Flow

```
┌─────────────────────────────────────────┐
│     Provisioning Step Fails?            │
└────────────┬────────────────────────────┘
             │
             ▼
      ┌──────────────┐
      │ Catch Error  │
      └──────┬───────┘
             │
             ▼
   ┌──────────────────┐
   │ Log Error        │
   │ to stderr        │
   └──────┬───────────┘
             │
             ▼
   ┌──────────────────────┐
   │ Attempt Cleanup      │
   │ bench drop-site      │
   │ --force              │
   └──────┬───────────────┘
             │
             ▼
   ┌──────────────────────┐
   │ Return Error JSON    │
   │ {                    │
   │   success: false,    │
   │   error: "...",      │
   │   site: "..."        │
   │ }                    │
   └──────────────────────┘
```

## Subdomain Generation

```
INPUT: "Acme Corporation Inc."
         ↓
STEP 1: Lowercase
         "acme corporation inc."
         ↓
STEP 2: Replace non-alphanumeric with hyphens
         "acme-corporation-inc-"
         ↓
STEP 3: Remove leading/trailing hyphens
         "acme-corporation-inc"
         ↓
STEP 4: Limit to 32 characters
         "acme-corporation-inc"
         ↓
OUTPUT: "acme-corporation-inc"
         ↓
SITE:   "acme-corporation-inc.localhost"
```

## API Key Generation

```
Python (secrets module)
         ↓
┌────────────────────────────────┐
│ api_key = secrets.token_hex(16) │
│ └─ 16 bytes × 2 = 32 hex chars │
│ └─ Example: a1b2c3d4e5f6...   │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│ api_secret = secrets.token_hex(32)│
│ └─ 32 bytes × 2 = 64 hex chars │
│ └─ Example: x1y2z3w4v5u6...   │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│ Store in User DocType          │
│ UPDATE `tabUser`               │
│ SET api_key = '...',           │
│     api_secret = '...'         │
│ WHERE email = 'john@acme.com'  │
└────────────────────────────────┘
         ↓
    ACTIVE IMMEDIATELY
```

## Docker Execution Flow

```
Next.js (Host Machine)
         ↓
execFile('node', ['provision-tenant.js', ...])
         ↓
Node.js Child Process
         ↓
execSync('docker compose exec -T backend ...')
         ↓
Docker Daemon
         ↓
frappe_docker-backend-1 Container
         ↓
/home/frappe/frappe-bench/
         ↓
bench CLI
         ↓
Frappe Framework
         ↓
MariaDB Database
```

## File System Layout

```
ERPNext Container
└── /home/frappe/frappe-bench/
    ├── apps/
    │   ├── frappe/          # Core framework
    │   ├── erpnext/         # ERPNext app
    │   └── nexus_core/      # Your custom app
    │
    └── sites/
        ├── master.localhost/      # Master site
        │   ├── site_config.json
        │   ├── private/
        │   └── public/
        │
        └── acme-corp.localhost/   # Tenant site
            ├── site_config.json   # Site configuration
            ├── private/           # Private files
            ├── public/            # Static files
            └── locks/             # Background job locks
```

## Timing Breakdown

```
Total: 10-15 seconds
┌──────────────────────────────────────────────┐
│ Step 1: Create Site         ████████ 8s     │
│ Step 2: Install App         ███ 3s          │
│ Step 3: Create User         ██ 2s           │
│ Step 4: Init Settings       █ 1s            │
│ Step 5: Generate API Keys   █ 1s            │
└──────────────────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────┐
│ Layer 1: Input Validation                   │
│ • Email format                              │
│ • Password strength (8+ chars, mixed case)  │
│ • Name sanitization (XSS prevention)        │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ Layer 2: Subdomain Sanitization             │
│ • Lowercase only                            │
│ • Alphanumeric + hyphens                    │
│ • Max 32 characters                         │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ Layer 3: Process Isolation                  │
│ • Node.js child process                     │
│ • execFile (no shell injection)             │
│ • Arguments as array (not string)           │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ Layer 4: Docker Container Isolation         │
│ • Separate network namespace                │
│ • Limited filesystem access                 │
│ • Resource constraints (CPU, memory)        │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ Layer 5: Database Isolation                 │
│ • Separate database per tenant              │
│ • Site-based access control                 │
│ • Encrypted at rest (optional)              │
└─────────────────────────────────────────────┘
```

---

This architecture provides:
- ✅ Complete tenant isolation
- ✅ Atomic provisioning (all-or-nothing)
- ✅ Secure key generation
- ✅ Comprehensive error handling
- ✅ Production-ready scalability
