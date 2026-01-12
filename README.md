# 🚀 Nexus - Headless ERP for Heavy Equipment Rental

> A modern, production-ready ERP frontend for heavy equipment rental businesses, built with Next.js 15 and powered by ERPNext Docker backend.

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=flat&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![ERPNext](https://img.shields.io/badge/ERPNext-v15-orange?style=flat)](https://erpnext.com)

---

## 📖 Table of Contents

- [What is Nexus?](#-what-is-nexus)
- [Architecture](#-architecture)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Folder Structure](#-folder-structure)
- [Setup Guide](#-setup-guide)
- [Environment Variables](#-environment-variables)
- [Development](#-development)
- [API Integration](#-api-integration)
- [Deployment](#-deployment)

---

## 🎯 What is Nexus?

Nexus is a **Headless ERP** solution that provides:

- 🎨 **Modern UI Layer** → Next.js with React Server Components + Shadcn UI
- ⚡ **Powerful Backend** → ERPNext (Frappe Framework) running in Docker
- 🔗 **Seamless Bridge** → Server Actions connecting frontend ↔ Frappe API
- 📊 **Industry-Specific** → Built for heavy equipment rental operations
- 🔒 **Production-Ready** → Full authentication, error handling, and data validation

**Think of it as:** A beautiful, custom frontend that replaces ERPNext's default UI while leveraging all its backend power.

---

## 🏗️ Architecture

### The "Headless" Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE (Browser)                  │
│                                                              │
│   ┌──────────────────────────────────────────────────┐     │
│   │   Next.js UI Components (React)                   │     │
│   │   - Dashboard, CRM, Fleet, Invoices              │     │
│   │   - Shadcn UI Components                         │     │
│   └──────────────────────────────────────────────────┘     │
│                          ↕                                   │
│   ┌──────────────────────────────────────────────────┐     │
│   │   Server Actions (app/actions/*.ts)              │     │
│   │   - User Authentication                          │     │
│   │   - Business Logic Layer                         │     │
│   │   - API Orchestration                            │     │
│   └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          ↕
                  HTTP/HTTPS Requests
                  (Frappe REST API)
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (ERPNext Docker)                    │
│                                                              │
│   ┌──────────────────────────────────────────────────┐     │
│   │   Frappe API Layer                               │     │
│   │   - REST Endpoints                               │     │
│   │   - Authentication (Session/API Keys)           │     │
│   │   - Business Logic Validation                   │     │
│   └──────────────────────────────────────────────────┘     │
│                          ↕                                   │
│   ┌──────────────────────────────────────────────────┐     │
│   │   ERPNext Core Modules                           │     │
│   │   - DocTypes (Customers, Items, Invoices)       │     │
│   │   - Workflows, Reports                          │     │
│   │   - Background Jobs                             │     │
│   └──────────────────────────────────────────────────┘     │
│                          ↕                                   │
│   ┌──────────────────────────────────────────────────┐     │
│   │   MariaDB Database                               │     │
│   │   - All business data stored here               │     │
│   └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **UI is Stateless** → All data lives in ERPNext
2. **Server Actions** → Bridge between React and Frappe API
3. **Session-Based Auth** → Uses ERPNext's built-in authentication
4. **API-First** → All operations go through Frappe's REST API
5. **Type-Safe** → Full TypeScript coverage from UI to API

---

## ✨ Key Features

### 📊 Core Modules

- **Dashboard** - Real-time metrics, revenue charts, activity feed
- **CRM** - Lead management, opportunity tracking, customer records
- **Fleet Management** - Equipment catalog, availability tracking, maintenance
- **Bookings** - Reservation system, calendar view, mobilization
- **Invoicing** - Create, submit, print, download PDF invoices
- **Quotations** - Generate quotes, convert to sales orders
- **Sales Orders** - Order processing and fulfillment
- **Projects** - Project tracking and task management
- **Payments** - Payment entry and reconciliation
- **Operators** - Equipment operator management
- **Tenants** - Multi-location/branch management
- **Inspections** - Equipment inspection workflows
- **Pricing Rules** - Dynamic pricing configuration

### 🎨 UI/UX Features

- **Modern Design** - Clean, minimal interface with Shadcn UI
- **Dark Mode** - System-preference based theme switching
- **Responsive** - Mobile-first design, works on all devices
- **Real-time Updates** - Live data fetching with React Server Components
- **PDF Export** - Generate professional PDFs for invoices/quotations
- **Print Layouts** - Custom print templates
- **Data Tables** - Sortable, filterable, paginated tables
- **Form Validation** - Client-side and server-side validation

### 🔒 Security Features

- **Authentication** - Secure login with ERPNext sessions
- **Authorization** - Role-based access control via ERPNext
- **CSRF Protection** - Built-in with Next.js middleware
- **Input Validation** - All inputs sanitized and validated
- **Error Handling** - Graceful error messages, no internal leaks

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library with Server Components
- **TypeScript 5** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework
- **Shadcn UI** - Beautiful, accessible component library
- **Recharts** - Data visualization
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend
- **ERPNext v15** - Open-source ERP
- **Frappe Framework** - Python web framework
- **MariaDB** - Database
- **Redis** - Caching and queue
- **Docker** - Containerization

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Git** - Version control
- **VS Code** - Recommended editor

---

## 📁 Folder Structure

```
nexus_erp/
│
├── app/                          # Next.js App Router
│   ├── (main)/                   # Protected dashboard routes
│   │   ├── dashboard/            # Dashboard page
│   │   ├── crm/                  # CRM module pages
│   │   ├── fleet/                # Fleet management
│   │   ├── bookings/             # Booking system
│   │   ├── invoices/             # Invoice management
│   │   ├── quotations/           # Quotation pages
│   │   ├── sales-orders/         # Sales order pages
│   │   ├── projects/             # Project management
│   │   ├── payments/             # Payment entries
│   │   ├── operators/            # Operator management
│   │   ├── tenants/              # Tenant/branch management
│   │   ├── inspections/          # Equipment inspections
│   │   ├── pricing-rules/        # Pricing configuration
│   │   ├── team/                 # Team management
│   │   ├── settings/             # Settings pages
│   │   ├── layout.tsx            # Dashboard layout (sidebar, header)
│   │   └── loading.tsx           # Loading states
│   │
│   ├── actions/                  # Server Actions (API layer)
│   │   ├── auth.ts               # Login/logout actions
│   │   ├── signup.ts             # User registration
│   │   ├── crm.ts                # CRM operations (leads, opportunities)
│   │   ├── fleet.ts              # Fleet/item operations
│   │   ├── bookings.ts           # Booking CRUD
│   │   ├── invoices.ts           # Invoice operations
│   │   ├── quotations.ts         # Quotation CRUD
│   │   ├── sales-orders.ts       # Sales order operations
│   │   ├── projects.ts           # Project management
│   │   ├── dashboard.ts          # Dashboard metrics
│   │   ├── operators.ts          # Operator management
│   │   ├── inspections.ts        # Inspection workflows
│   │   ├── pricing-rules.ts      # Pricing operations
│   │   ├── team.ts               # Team/user management
│   │   ├── settings.ts           # Settings operations
│   │   └── common.ts             # Shared utilities
│   │
│   ├── api/                      # API routes (REST endpoints)
│   │   └── chat/                 # Chat API
│   │
│   ├── lib/                      # Utilities and helpers
│   │   ├── api.ts                # Frappe API client (userRequest, frappeRequest)
│   │   └── utils.ts              # Shared utilities
│   │
│   ├── login/                    # Login page
│   │   └── page.tsx
│   │
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home/landing page
│
├── components/                   # React Components
│   ├── ui/                       # Shadcn UI primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── form.tsx
│   │   └── ... (all Shadcn components)
│   │
│   ├── crm/                      # CRM-specific components
│   │   ├── create-lead-dialog.tsx
│   │   ├── convert-lead-dialog.tsx
│   │   └── ...
│   │
│   ├── fleet/                    # Fleet-specific components
│   ├── bookings/                 # Booking components
│   ├── invoices/                 # Invoice components
│   ├── quotations/               # Quotation components
│   ├── dashboard/                # Dashboard widgets
│   ├── operators/                # Operator components
│   ├── inspections/              # Inspection components
│   ├── pricing-rules/            # Pricing rule components
│   ├── team/                     # Team components
│   │
│   ├── app-sidebar.tsx           # Main navigation sidebar
│   ├── theme-provider.tsx        # Dark mode provider
│   └── theme-toggle.tsx          # Dark mode toggle
│
├── contexts/                     # React Contexts
│   └── organization-context.tsx  # Organization state
│
├── lib/                          # Shared libraries
│   ├── design-system.ts          # Design tokens
│   └── utils.ts                  # Utility functions
│
├── types/                        # TypeScript types
│   ├── rental-pricing.ts
│   └── subscription.ts
│
├── public/                       # Static assets
│
├── middleware.ts                 # Next.js middleware (auth protection)
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS config
├── tsconfig.json                 # TypeScript config
├── package.json                  # Dependencies
└── .env.local                    # Environment variables (not in git)
```

---

## 🚀 Setup Guide

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download](https://git-scm.com/)
- **VS Code** (Recommended) - [Download](https://code.visualstudio.com/)

### Step 1: Clone Repository

```bash
git clone <your-repo-url>
cd nexus_erp
```

### Step 2: Set Up ERPNext Docker Backend

Follow the [Frappe Docker guide](https://github.com/frappe/frappe_docker) to set up ERPNext:

```bash
# Clone frappe_docker
git clone https://github.com/frappe/frappe_docker.git
cd frappe_docker

# Start containers
docker-compose up -d

# Create a new site
docker-compose exec backend bench new-site erp.localhost \
  --admin-password admin \
  --mariadb-root-password root

# Install ERPNext app
docker-compose exec backend bench --site erp.localhost install-app erpnext

# (Optional) Install custom app if you have one
docker-compose exec backend bench --site erp.localhost install-app nexus_core
```

Your ERPNext instance should now be running at `http://localhost:8080`

### Step 3: Generate API Keys

1. Open ERPNext: `http://localhost:8080`
2. Login with Administrator (password: `admin`)
3. Go to: **User Menu → API Access → Generate Keys**
4. Copy the **API Key** and **API Secret**

### Step 4: Configure Environment Variables

Create `.env.local` in the project root:

```env
# ERPNext Connection
ERP_NEXT_URL=http://127.0.0.1:8080
FRAPPE_SITE_NAME=erp.localhost

# API Credentials (from Step 3)
ERP_API_KEY=your_api_key_here
ERP_API_SECRET=your_api_secret_here

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 5: Install Dependencies

```bash
npm install
```

### Step 6: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 7: Test Login

Default ERPNext credentials:
- **Email:** `Administrator`
- **Password:** `admin`

---

## 🔧 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ERP_NEXT_URL` | ERPNext backend URL | `http://127.0.0.1:8080` |
| `FRAPPE_SITE_NAME` | Frappe site name | `erp.localhost` |
| `ERP_API_KEY` | ERPNext API key | `abc123...` |
| `ERP_API_SECRET` | ERPNext API secret | `xyz789...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Frontend URL | `http://localhost:3000` |
| `NODE_ENV` | Environment | `development` |

---

## 💻 Development

### Running Commands

```bash
# Development server (with hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Code Style

- **TypeScript** - All code is TypeScript
- **ESLint** - Enforced code standards
- **Prettier** - Auto-formatting (if configured)

### Adding New Features

1. **Create Server Action** (`app/actions/my-feature.ts`)
   ```typescript
   'use server'
   import { userRequest } from '../lib/api'
   
   export async function getMyData() {
     return userRequest('my.endpoint.get_data')
   }
   ```

2. **Create Page** (`app/(main)/my-feature/page.tsx`)
   ```typescript
   import { getMyData } from '@/app/actions/my-feature'
   
   export default async function MyFeaturePage() {
     const data = await getMyData()
     return <div>{/* Render data */}</div>
   }
   ```

3. **Add Navigation** (Edit `components/app-sidebar.tsx`)

---

## 🔌 API Integration

### Understanding the API Layer

Nexus uses **two types of API requests**:

#### 1. `userRequest()` - Session-Based (User Operations)

Uses the logged-in user's session cookie for authentication.

**Use for:** CRM, Fleet, Invoices, Quotations, etc.

```typescript
import { userRequest } from '@/app/lib/api'

// GET request
const customers = await userRequest('frappe.client.get_list', 'GET', {
  doctype: 'Customer',
  fields: JSON.stringify(['name', 'customer_name']),
  limit_page_length: 20
})

// POST request
const invoice = await userRequest('frappe.client.insert', 'POST', {
  doc: {
    doctype: 'Sales Invoice',
    customer: 'CUST-001',
    items: [...]
  }
})
```

#### 2. `frappeRequest()` - API Key-Based (Admin Operations)

Uses API Key/Secret for authentication.

**Use for:** Creating users, system configuration, admin tasks.

```typescript
import { frappeRequest } from '@/app/lib/api'

// Create a new user
const user = await frappeRequest('frappe.client.insert', 'POST', {
  doc: {
    doctype: 'User',
    email: 'newuser@example.com',
    first_name: 'John',
    last_name: 'Doe'
  }
})
```

### Common Frappe API Patterns

```typescript
// List documents
frappe.client.get_list

// Get single document
frappe.client.get

// Insert document
frappe.client.insert

// Update document
frappe.client.set_value

// Delete document
frappe.client.delete

// Custom method
your_app.your_module.your_function
```

---

## 🚢 Deployment

### Production Checklist

- [ ] Set environment variables on hosting platform
- [ ] Build production bundle: `npm run build`
- [ ] Configure ERPNext backend for production
- [ ] Set up SSL certificates (HTTPS)
- [ ] Configure CORS in ERPNext if needed
- [ ] Set up database backups
- [ ] Configure monitoring and logging

### Deployment Platforms

**Vercel** (Recommended for Next.js)
```bash
npm install -g vercel
vercel --prod
```

**Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

**Other Platforms:** AWS, Azure, Railway, Render, DigitalOcean, etc.

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [ERPNext Documentation](https://docs.erpnext.com/)
- [Frappe Framework Documentation](https://frappeframework.com/docs)
- [Shadcn UI Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 💬 Support

For questions or issues:
- Open a GitHub issue
- Contact: your-email@example.com

---

**Built with ❤️ for the Heavy Equipment Rental Industry**

