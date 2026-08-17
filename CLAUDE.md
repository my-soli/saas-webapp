# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Next.js dev server (port 3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```

No test runner is configured. The Django backend must be running at `http://localhost:8000` (set via `DJANGO_API_URL` in `.env.local`).

## Architecture Overview

**Print Duka** is a multi-portal print shop SaaS. Next.js 16 (App Router) serves as the frontend and proxy layer; all business logic lives in a Django backend.

### Portal Structure

Five role-based portals, each a separate section of `app/`:

| Route prefix | Role | Portal |
|---|---|---|
| `/admin` | `admin` | Admin dashboard |
| `/account-manager` | `account_manager` | Account managers |
| `/portal` | `client` | Client portal |
| `/production-team` | `production_team` | Production team |
| `/vendors` | `vendor` | Vendor portal |
| `/store` | public + client | Storefront |

`proxy.ts` (Next.js 16 renamed `middleware` → `proxy`) enforces access: checks the `sessionid` cookie via `GET /api/auth/session/check/`, then applies `ROUTE_ALLOWED_ROLES` to redirect unauthorized users.

### Request Flow

```
Browser → Next.js middleware (auth check)
       → Page / Client component
       → services/*.ts  OR  lib/api/*.ts
       → app/api/proxy/[...path]/route.ts  (injects sessionid + CSRF)
       → Django backend (localhost:8000)
```

**`services/`** — 22 domain-centric files (`clients.ts`, `vendors.ts`, `jobs.ts`, `quotes.ts`, etc.). These are the primary API client layer; they route through `/api/proxy/` to avoid CORS and attach cookies automatically.

**`lib/api/`** — Smaller set of specialized helpers: `auth.ts`, `users.ts`, `settings.ts`, `notifications.ts`, `alerts.ts`, `audit-logs.ts`. More closely tied to backend implementation details than `services/`.

**`app/api/`** — Next.js route handlers:
- `auth/session/login` / `logout` / `check` — session lifecycle
- `auth/csrf` — CSRF token endpoint
- `proxy/[...path]` — transparent proxy to Django; injects CSRF and `sessionid` cookies

### Auth Pattern

Django owns authentication. Next.js is purely a session broker:
1. Login: fetch CSRF token → POST credentials + CSRF to Django → extract `sessionid` → set cookie on browser
2. Every request: proxy injects `sessionid` + CSRF header before forwarding to Django
3. Roles come from Django's `user.portal_role` field, enforced in middleware

### UI Layer

- **`features/`** — Feature-scoped components grouped by domain (`clients/`, `jobs/`, `products/`, `quotes/`, `dashboard/`, etc.). Heavy business logic lives here.
- **`components/`** — Shared UI split by portal (`admin/`, `client/`, `production/`, `vendor/`) plus `ui/` (shadcn/ui primitives).
- **`types/`** — TypeScript interfaces for all domains.
- **`lib/validations/`** — Zod schemas.

### Key Libraries

- **shadcn/ui** (new-york style) + Radix UI primitives
- **Tailwind CSS v4** (`@tailwindcss/postcss` plugin — not v3 config format)
- **TanStack React Query v5** for server state
- **Recharts** for charts, **Framer Motion** for animation
- **@dnd-kit** for drag-and-drop
- **Sonner** for toast notifications
- **Zod** for validation

### Path Alias

`@/*` maps to the repository root. Use `@/services/...`, `@/features/...`, etc.
