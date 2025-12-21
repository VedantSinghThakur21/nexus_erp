# 🏢 Nexus ERP

> A modern, headless ERP frontend built with Next.js 14+ that provides a beautiful, custom UI layer for ERPNext.

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=flat&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com)

---

## 🎯 What is Nexus ERP?

Nexus ERP is a **Headless ERP Architecture** implementation that combines:
- 🎨 **Modern UI Layer** → Next.js with React Server Components
- ⚡ **Powerful Backend** → ERPNext (Frappe Framework) running in Docker
- 🔗 **Seamless Bridge** → Server Actions connecting frontend ↔ backend

**Think of it as:** A sleek, customizable dashboard that "drives" your robust ERPNext engine under the hood.

---

## ✨ Features

- 📊 **Real-time Dashboard** with metrics & analytics
- 📄 **Invoice Management** (Create, Submit, Print, Download PDFs)
- 👥 **CRM with Kanban Board** (Drag & drop lead pipeline)
- 🚗 **Fleet Management** (Vehicle tracking, bookings, inspections)
- 💼 **Project Tracking** with timelines
- 🤖 **AI Chat Assistant** powered by OpenAI/Google AI
- 🎨 **Enterprise UI** with Shadcn components
- 🔐 **Secure API Authentication** (Key/Secret based)

---

## 🚀 Quick Start

### 1️⃣ Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org))
- **ERPNext Instance** (Docker or hosted) ([Setup Guide](https://frappeframework.com/docs/user/en/installation))
- **ERPNext API Keys** (Generated from User Profile)

### 2️⃣ Installation

```powershell
# Clone the repository
git clone https://github.com/yourusername/nexus_erp.git
cd nexus_erp

# Install dependencies
npm install

# Configure environment variables
# Copy .env.example to .env.local and fill in your ERPNext details
Copy-Item .env.example .env.local
# Edit .env.local with your credentials
```

### 3️⃣ Configuration

Edit `.env.local`:

```env
# Your ERPNext instance URL
ERP_NEXT_URL=http://127.0.0.1:8080

# API credentials (generate from ERPNext User Profile)
ERP_API_KEY=your_api_key_here
ERP_API_SECRET=your_api_secret_here

# Public URL for client-side access (PDFs, downloads)
NEXT_PUBLIC_ERP_NEXT_URL=http://127.0.0.1:8080
```

**🔑 How to get API Keys:**
1. Login to ERPNext
2. Go to **User Profile → API Access**
3. Click **"Generate Keys"**
4. Copy API Key & Secret to `.env.local`

### 4️⃣ Run Development Server

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 📂 Project Structure

```
nexus_erp/
├── app/
│   ├── actions/          # Server Actions (ERPNext API bridge)
│   ├── lib/              # API client & utilities
│   ├── (main)/           # Protected dashboard routes
│   │   ├── dashboard/
│   │   ├── invoices/
│   │   ├── crm/
│   │   └── fleet/
│   ├── print/            # Print-friendly layouts
│   └── login/            # Authentication
│
├── components/
│   ├── ui/               # Reusable Shadcn components
│   ├── invoices/         # Invoice-specific components
│   ├── crm/              # CRM components (Kanban, etc.)
│   └── fleet/            # Fleet management components
│
├── .env.local            # Environment variables (DO NOT COMMIT)
├── ARCHITECTURE.md       # 📖 Deep dive into architecture
├── CHECKLIST.md          # ✅ Setup & health check guide
└── SETUP_AND_CLEANUP.md  # 🛠️ Troubleshooting guide
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | Complete technical documentation, data flow, patterns |
| **[docs/CHECKLIST.md](./docs/CHECKLIST.md)** | Step-by-step setup verification & troubleshooting |
| **[docs/SETUP_AND_CLEANUP.md](./docs/SETUP_AND_CLEANUP.md)** | Installation, debugging, common issues |
| **[docs/VISUAL_ARCHITECTURE.md](./docs/VISUAL_ARCHITECTURE.md)** | Diagrams & visual guides |
| **[docs/QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md)** | Daily coding patterns & quick reference |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│         Next.js Frontend                │
│  (Server Components + Client Hooks)     │
│                                          │
│  ┌────────────┐     ┌────────────────┐ │
│  │    UI      │────▶│ Server Actions │ │
│  └────────────┘     └────────────────┘ │
│                            │             │
└────────────────────────────┼─────────────┘
                             │ REST API
                 ┌───────────▼──────────┐
                 │  ERPNext Backend     │
                 │  (Frappe + MySQL)    │
                 └──────────────────────┘
```

### Key Concepts

1. **Server Actions** → Bridge between UI and ERPNext (keeps secrets safe)
2. **Server Components** → Fetch data on server, pass props to client
3. **Client Components** → Handle interactivity (forms, drag & drop)
4. **Route Groups `(main)`** → Shared layouts without URL nesting
5. **Dynamic Routes `[id]`** → Detail pages like `/crm/LEAD-001`

📖 **Full details:** [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🛠️ Development

### Scripts

```powershell
# Development server (with hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Adding a New Module

```typescript
// 1. Create Server Action (app/actions/quotations.ts)
'use server'
export async function getQuotations() {
  return await frappeRequest('frappe.client.get_list', 'GET', {
    doctype: 'Quotation'
  })
}

// 2. Create Page (app/(main)/quotations/page.tsx)
import { getQuotations } from '@/app/actions/quotations'
export default async function QuotationsPage() {
  const quotations = await getQuotations()
  return <QuotationList quotations={quotations} />
}

// 3. Add to Sidebar (components/app-sidebar.tsx)
<NavLink href="/quotations" icon={FileText}>Quotations</NavLink>
```

---

## 🧪 Testing

```powershell
# Test ERPNext connection
curl -H "Authorization: token YOUR_KEY:YOUR_SECRET" `
  http://127.0.0.1:8080/api/method/frappe.auth.get_logged_user

# Check if dev server is running
curl http://localhost:3000/api/health
```

---

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| **"Cannot connect to ERPNext"** | Check `ERP_NEXT_URL` in `.env.local`, ensure ERPNext is running |
| **"Not permitted"** | Regenerate API keys, verify user has "System User" role |
| **"Environment variable undefined"** | Use `NEXT_PUBLIC_*` prefix for client-side vars |
| **Stale data after mutation** | Add `revalidatePath('/your-route')` in Server Actions |

🔍 **Full troubleshooting:** [SETUP_AND_CLEANUP.md](./SETUP_AND_CLEANUP.md)

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

```powershell
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard:
# Settings → Environment Variables
# Add: ERP_NEXT_URL, ERP_API_KEY, ERP_API_SECRET, NEXT_PUBLIC_ERP_NEXT_URL
```

### Deploy to Other Platforms

- **AWS Amplify:** [Guide](https://docs.amplify.aws)
- **Netlify:** [Guide](https://docs.netlify.com/frameworks/next-js/)
- **Self-hosted:** `npm run build && npm start`

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[Next.js](https://nextjs.org)** - The React Framework
- **[ERPNext](https://erpnext.com)** - Open Source ERP
- **[Shadcn UI](https://ui.shadcn.com)** - Beautiful UI Components
- **[Frappe Framework](https://frappeframework.com)** - Python Web Framework

---

## 📞 Support

- 📖 **Documentation:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- 🐛 **Issues:** [GitHub Issues](https://github.com/yourusername/nexus_erp/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/yourusername/nexus_erp/discussions)
- 📧 **Email:** your.email@example.com

---

## 🗺️ Roadmap

- [ ] Multi-tenant support
- [ ] Real-time notifications (WebSockets)
- [ ] Offline mode (PWA)
- [ ] Mobile app (React Native)
- [ ] Advanced reporting engine
- [ ] Custom DocType builder

---

**Built with ❤️ using Next.js & ERPNext**

