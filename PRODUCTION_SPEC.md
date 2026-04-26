# Framework Studio — Production App Specification

**Version:** 1.0  
**Date:** April 2026  
**Stack:** Next.js (JavaScript) · Node.js + Express (JavaScript) · PostgreSQL (Neon) · Prisma · Turborepo  
**Deployment:** Vercel (both apps)

> **Language note:** This build uses plain JavaScript (`.js` / `.jsx`) end-to-end. TypeScript migration is deferred to a future iteration.

---

## Table of Contents

1. [What We're Building](#1-what-were-building)
2. [Architecture Overview](#2-architecture-overview)
3. [Auth Recommendation — Clerk](#3-auth-recommendation--clerk)
4. [Tech Stack](#4-tech-stack)
5. [Turborepo Structure](#5-turborepo-structure)
6. [Database Schema (Prisma)](#6-database-schema-prisma)
7. [API Design](#7-api-design)
8. [Frontend Architecture](#8-frontend-architecture)
9. [File Storage](#9-file-storage)
10. [Deployment](#10-deployment)
11. [Environment Variables](#11-environment-variables)
12. [Migrating from the MVP](#12-migrating-from-the-mvp)
13. [Development Setup](#13-development-setup)
14. [v1 Scope & Out of Scope](#14-v1-scope--out-of-scope)

---

## 1. What We're Building

A production-grade internal studio management tool for Framework Studio. The MVP was a single-file HTML app storing data in `localStorage`. The production app moves that data to a shared PostgreSQL database so 2–4 studio members can access the same data from any device without conflicts.

### What stays the same
- All the core features: team cost tracking, pipeline, estimates (fixed + retainer), value-based pricing, profit calculator, studio overheads, software subscriptions, dashboard
- The calculation logic (margin, tax, partner split, weighted pipeline)
- No invoicing module

### What changes
- Data lives in PostgreSQL (Neon) instead of localStorage
- 2–4 studio members can log in with their own accounts and see shared data
- A Node.js API handles all data access
- Next.js frontend replaces the single HTML file
- Deployed on Vercel — accessible from anywhere

### What this is NOT
- Not a multi-tenant SaaS (one studio, not many)
- Not real-time collaborative (no simultaneous editing conflicts to resolve)
- Not client-facing (only studio members log in)

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                        Vercel                             │
│                                                          │
│  ┌─────────────────────┐    ┌─────────────────────────┐  │
│  │   Next.js (web)     │    │  Node.js API (api)      │  │
│  │   App Router        │───▶│  Express / Fastify      │  │
│  │   Clerk frontend    │    │  Prisma ORM             │  │
│  │   React components  │    │  Clerk backend SDK      │  │
│  └─────────────────────┘    └────────────┬────────────┘  │
│                                          │                │
└──────────────────────────────────────────┼────────────────┘
                                           │
                                 ┌─────────▼──────────┐
                                 │   Neon PostgreSQL   │
                                 │   (Serverless PG)   │
                                 └────────────────────┘
```

**Request flow:**
1. User visits the web app (Next.js on Vercel)
2. Clerk handles authentication (login page, session tokens)
3. Authenticated pages call the Node.js API with a Clerk JWT
4. API verifies the JWT with Clerk, checks the user belongs to the studio, then queries Neon via Prisma
5. Data is returned to the frontend

**Why split frontend and backend?**  
The Node.js API is intentionally separate from Next.js API routes so the business logic, Prisma schema, and calculation engine can evolve independently of the UI. It also makes it easier to test the API in isolation and potentially expose it to other clients later.

---

## 3. Auth Recommendation — Clerk

**Recommendation: [Clerk](https://clerk.com)**

### Why Clerk

| Concern | Clerk | NextAuth | Custom JWT |
|---|---|---|---|
| Setup time | 30 min | 2–3 hrs | Days |
| Invite-only access | Built in | Manual | Manual |
| Session management | Managed | Semi-managed | You build it |
| Works with Turborepo | ✅ First-class | ✅ | ✅ |
| Node.js backend SDK | ✅ | ❌ (Next.js only) | ✅ |
| Free tier | 10k MAU | Free | Free |
| Production-ready | Day 1 | Day 1 | Months |

**The key reason:** Clerk has a real **organization** concept built in. You create one organization ("Framework Studio"), invite Sanchit and Arjun (and whoever else), and Clerk handles the invite emails, session tokens, and member management. Your Node.js API just verifies the JWT and checks `org_id` — that's it.

NextAuth is excellent but it's tightly coupled to Next.js API routes. Since you have a separate Node.js backend, you'd need to rebuild token verification there manually. Clerk's backend SDK works identically in both Next.js and Node.js.

### How auth works in this app

1. **Signup/Login:** Clerk-hosted UI (or embed their `<SignIn />` component)
2. **Invite:** Studio admin invites members via Clerk dashboard — no public signup
3. **Session:** Clerk issues a JWT; Next.js middleware verifies it on every request
4. **API calls:** Frontend attaches the Clerk JWT as `Authorization: Bearer <token>`; Node.js API verifies it with `@clerk/backend`
5. **Studio membership check:** On every API request, middleware checks the user's `orgId` matches the configured `STUDIO_ORG_ID` env var — rejects anything else

---

## 4. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| **Monorepo** | Turborepo | Shared packages, parallel builds, task caching |
| **Frontend** | Next.js 14+ (App Router) | Best-in-class React framework, deploys to Vercel natively |
| **Backend** | Node.js + Express | Battle-tested, simple, huge ecosystem, easy to deploy |
| **ORM** | Prisma | Type-safe queries, migrations, works perfectly with Neon |
| **Database** | Neon PostgreSQL (serverless) | Serverless PG, scales to zero, generous free tier, branches for dev |
| **Auth** | Clerk | See Section 3 |
| **File Storage** | Vercel Blob | Same Vercel project, simple SDK, pay-per-use |
| **Deployment** | Vercel | Both apps deploy from the same repo |
| **Language** | JavaScript (ESM/CJS) | Faster iteration for v1; TypeScript migration deferred |
| **Styling** | Tailwind CSS | Utility-first, consistent with the MVP's design language |
| **UI components** | shadcn/ui | Accessible, unstyled-first, easy to customise |

### Why Express

- Already wired up and working in this project
- Smallest API surface — no plugin system to learn
- Trivial to host as a single Vercel serverless handler or on Railway
- Validation handled by lightweight `zod` (or `joi`) inside the controller layer

---

## 5. Turborepo Structure

```
framework-studio/
├── apps/
│   ├── web/                    # Next.js frontend (JavaScript)
│   │   ├── app/
│   │   │   ├── (auth)/         # Login, onboarding pages
│   │   │   ├── (dashboard)/    # Protected app pages
│   │   │   │   ├── page.jsx            # Dashboard
│   │   │   │   ├── team/page.jsx       # Studio Expenses
│   │   │   │   ├── prospects/page.jsx  # Pipeline
│   │   │   │   ├── estimates/page.jsx  # Estimates list
│   │   │   │   ├── estimates/[id]/page.jsx  # Estimate detail
│   │   │   │   └── settings/page.jsx   # Studio Profile
│   │   │   ├── layout.jsx
│   │   │   └── middleware.js   # Clerk auth middleware
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   ├── dashboard/      # Dashboard-specific components
│   │   │   ├── estimates/      # Estimate builder components
│   │   │   ├── prospects/      # Pipeline components
│   │   │   └── shared/         # Nav, layout, modals
│   │   ├── hooks/              # React Query hooks (useTeam, useProspects, …)
│   │   ├── lib/
│   │   │   ├── api.js          # API client (fetch wrapper)
│   │   │   ├── queryClient.js  # React Query client config
│   │   │   └── calc.js         # Calculation logic (mirrors api/src/lib/calc.js)
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── api/                    # Node.js Express backend (JavaScript)
│       ├── server.js           # Express app entry — mounts middleware + routes
│       ├── src/
│       │   ├── middleware/
│       │   │   ├── auth.js     # Clerk JWT verification + studio-membership check
│       │   │   ├── errorHandler.js
│       │   │   └── validate.js # zod schema validator
│       │   ├── lib/
│       │   │   ├── db.js       # Singleton PrismaClient
│       │   │   ├── calc.js     # Calculation helpers
│       │   │   └── serialize.js # BigInt-safe JSON serialiser
│       │   ├── controllers/    # Request handlers (no Express imports)
│       │   │   ├── settings.controller.js
│       │   │   ├── team.controller.js
│       │   │   ├── roles.controller.js
│       │   │   ├── software.controller.js
│       │   │   ├── overheads.controller.js
│       │   │   ├── prospects.controller.js
│       │   │   ├── estimates.controller.js
│       │   │   └── dashboard.controller.js
│       │   └── routes/         # Express routers — wire URL → controller
│       │       ├── index.js    # Mounts every resource router
│       │       ├── settings.routes.js
│       │       ├── team.routes.js
│       │       ├── roles.routes.js
│       │       ├── software.routes.js
│       │       ├── overheads.routes.js
│       │       ├── prospects.routes.js
│       │       ├── estimates.routes.js
│       │       └── dashboard.routes.js
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── seed.js
│       └── package.json
│
├── packages/                   # Created on demand when shared code emerges
│   └── calc/                   # Pure calculation functions (no DB, no React)
│       ├── src/
│       │   ├── estimate.js     # calcEst, calcRetainer
│       │   ├── tax.js          # calcTax by entity type
│       │   ├── partner.js      # calcPartner, profit split
│       │   ├── pricing.js      # vaSignals → margin suggestion
│       │   └── index.js
│       └── package.json
│
│   # Notes:
│   # - `database` package is intentionally omitted; Prisma lives in apps/api/prisma
│   #   and is the single source of truth. The web app does not import Prisma.
│   # - `types` package is omitted because the project is JavaScript-only.
│   # - `config` packages can be added later if shared ESLint/Tailwind configs
│   #   become useful.
│
├── turbo.json
├── package.json                # Root workspace
└── .env                        # Root env (gitignored)
```

### Key `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {}
  }
}
```

---

## 6. Database Schema (Prisma)

File: `packages/database/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")   // Required for Neon serverless
}

// ─── STUDIO ───────────────────────────────────────────────
// Single row — this app serves one studio
model Studio {
  id          String   @id @default(cuid())
  name        String
  founderNames String
  email       String?
  phone       String?
  gstin       String?
  entity      EntityType @default(LLP)
  gstRegistered Boolean @default(false)
  workingDaysPerMonth Int @default(22)
  workingHoursPerDay  Int @default(6)
  clerkOrgId  String   @unique  // Links to Clerk organisation

  pipelineProbLead        Int @default(20)
  pipelineProbProposal    Int @default(50)
  pipelineProbNegotiating Int @default(75)

  dashBlockOrder String[]  // ordered list of dashboard section keys
  kpiOrder       String[]  // ordered list of KPI tile keys

  fyReviewDismissedYear Int?

  teamMembers    TeamMember[]
  roles          Role[]
  software       SoftwareTool[]
  overheadItems  OverheadItem[]
  prospects      Prospect[]
  estimates      Estimate[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum EntityType {
  LLP
  SOLE_PROP
  PARTNERSHIP
  PVT_LTD
  NON_PROFIT
}

// ─── TEAM ─────────────────────────────────────────────────
model TeamMember {
  id         String  @id @default(cuid())
  studioId   String
  studio     Studio  @relation(fields: [studioId], references: [id], onDelete: Cascade)

  name       String
  roleId     String?
  role       Role?   @relation(fields: [roleId], references: [id], onDelete: SetNull)
  experience String  // e.g. "3–5 yrs"
  monthlyCost Int    // INR, full CTC
  isActive   Boolean @default(true)
  isPartner  Boolean @default(false)
  equityPct  Float   @default(0)
  execPremPct Float  @default(0)
  bdevPremPct Float  @default(0)

  softwareAssignments SoftwareAssignment[]
  estimateAllocations EstimateAllocation[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Role {
  id         String @id @default(cuid())
  studioId   String
  studio     Studio @relation(fields: [studioId], references: [id], onDelete: Cascade)
  name       String
  department Department

  teamMembers TeamMember[]

  @@unique([studioId, name])
}

enum Department {
  DESIGN
  TECHNOLOGY
  STRATEGY
  MANAGEMENT
  OPERATIONS
  OTHER
}

// ─── SOFTWARE ─────────────────────────────────────────────
model SoftwareTool {
  id          String  @id @default(cuid())
  studioId    String
  studio      Studio  @relation(fields: [studioId], references: [id], onDelete: Cascade)

  name        String
  costPerSeat Int     // monthly INR per seat
  startDate   DateTime?
  isSharedLicence Boolean @default(false) // true = flat cost, whole team

  assignments SoftwareAssignment[]
  estimateExclusions EstimateExclusion[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model SoftwareAssignment {
  id           String       @id @default(cuid())
  softwareId   String
  software     SoftwareTool @relation(fields: [softwareId], references: [id], onDelete: Cascade)
  memberId     String
  member       TeamMember   @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([softwareId, memberId])
}

// ─── OVERHEADS ────────────────────────────────────────────
model OverheadItem {
  id        String  @id @default(cuid())
  studioId  String
  studio    Studio  @relation(fields: [studioId], references: [id], onDelete: Cascade)

  category  OverheadCategory
  label     String
  amount    Int       // monthly INR
  startDate DateTime?
  endDate   DateTime? // null = active; set = stopped from this date

  estimateExclusions EstimateExclusion[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum OverheadCategory {
  RENT
  UTILITIES
  ACCOUNTANT
  INTERNET
  MISC
  OTHER
}

// ─── PROSPECTS ────────────────────────────────────────────
model Prospect {
  id        String  @id @default(cuid())
  studioId  String
  studio    Studio  @relation(fields: [studioId], references: [id], onDelete: Cascade)

  projectName  String
  clientName   String
  contactName  String?
  email        String?
  phone        String?
  website      String?
  domain       String?       // industry/domain
  stage        PipelineStage @default(LEAD)

  // Value signals
  vsMode        VAPricingMode @default(MATRIX)
  vsComplexity  Int @default(2)  // 1=simple, 2=standard, 3=complex
  vsImpact      Int @default(2)  // 1=tactical, 2=important, 3=transformative
  vsUrgency     Urgency @default(STANDARD)
  vsCompetitive Competitive @default(SHORTLISTED)
  vsClientSize  ClientSize @default(FUNDED)
  vsRevenueImpact BigInt?        // client's projected year-1 revenue impact (INR)

  estimate  Estimate?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum PipelineStage {
  LEAD
  PROPOSAL_SENT
  NEGOTIATING
  WON
  LOST
}

enum VAPricingMode {
  MATRIX
  REVENUE
}

enum Urgency {
  STANDARD
  EXPEDITED
  CRITICAL
}

enum Competitive {
  SOLE
  SHORTLISTED
  PITCH
}

enum ClientSize {
  BOOTSTRAP
  FUNDED
  SME
  ENTERPRISE
}

// ─── ESTIMATES ────────────────────────────────────────────
model Estimate {
  id        String  @id @default(cuid())
  studioId  String
  studio    Studio  @relation(fields: [studioId], references: [id], onDelete: Cascade)

  name      String
  type      EstimateType @default(FIXED)
  durationWeeks Int?    // null for retainer (open-ended)
  margin    Float?      // collective margin % for fixed; null for retainer

  commissionType    CommissionType @default(NONE)
  commissionCustomPct Float?

  contractValue     BigInt?  // signed contract value; null = use calculated quote
  executionLeadId   String?  // TeamMember who led delivery

  prospectId String?  @unique
  prospect   Prospect? @relation(fields: [prospectId], references: [id], onDelete: SetNull)

  allocations        EstimateAllocation[]
  exclusions         EstimateExclusion[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum EstimateType {
  FIXED
  RETAINER
}

enum CommissionType {
  NONE
  REFERRAL_3
  SALES_PARTNER_7
  INTERNAL_1_5
  CUSTOM
}

model EstimateAllocation {
  id          String   @id @default(cuid())
  estimateId  String
  estimate    Estimate @relation(fields: [estimateId], references: [id], onDelete: Cascade)
  memberId    String
  member      TeamMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  allocationPct Int    // 0–100
  weeks         Int?   // for fixed estimates; may differ per member
  margin        Float? // per-resource margin for retainer type

  @@unique([estimateId, memberId])
}

// Tracks which software tools and overhead items are excluded from an estimate
model EstimateExclusion {
  id         String   @id @default(cuid())
  estimateId String
  estimate   Estimate @relation(fields: [estimateId], references: [id], onDelete: Cascade)

  softwareId   String?
  software     SoftwareTool? @relation(fields: [softwareId], references: [id], onDelete: Cascade)

  overheadId   String?
  overhead     OverheadItem? @relation(fields: [overheadId], references: [id], onDelete: Cascade)

  @@unique([estimateId, softwareId])
  @@unique([estimateId, overheadId])
}
```

### Key schema decisions

**Single `Studio` row** — The app serves one studio. No multi-tenant isolation needed. The `clerkOrgId` links Clerk's organisation to this row, and every API request verifies the caller belongs to that org.

**`EstimateExclusion` join table** — Cleaner than storing arrays of excluded IDs as JSON columns. Deletions cascade properly.

**`vsRevenueImpact` as `BigInt`** — Revenue impact values can be crore-range numbers. BigInt is safer than Float for financial integers.

**No `Invoice` table** — Invoicing is out of scope for v1.

---

## 7. API Design

**Base URL:** `https://api.frameworkstudio.in` (or Vercel function URL)  
**Auth header:** `Authorization: Bearer <clerk-jwt>` on every request  
**Response format:** `{ data: T }` for success, `{ error: string, code: string }` for errors

### Middleware (applied to all routes)

```
1. verifyClerkJWT(req)          → extracts userId, orgId
2. requireStudioMembership()    → confirms orgId === STUDIO_ORG_ID
3. attachPrisma()               → attaches db client to request context
```

### Routes

#### Studio Settings
| Method | Path | Description |
|---|---|---|
| `GET` | `/settings` | Get full studio config |
| `PATCH` | `/settings` | Update studio settings |

#### Team Members
| Method | Path | Description |
|---|---|---|
| `GET` | `/team` | List all team members |
| `POST` | `/team` | Add a team member |
| `PATCH` | `/team/:id` | Update a team member |
| `DELETE` | `/team/:id` | Remove a team member |

#### Roles
| Method | Path | Description |
|---|---|---|
| `GET` | `/roles` | List all roles |
| `POST` | `/roles` | Create a role |
| `PATCH` | `/roles/:id` | Update a role |
| `DELETE` | `/roles/:id` | Delete a role |

#### Software
| Method | Path | Description |
|---|---|---|
| `GET` | `/software` | List all tools |
| `POST` | `/software` | Add a tool |
| `PATCH` | `/software/:id` | Update a tool |
| `DELETE` | `/software/:id` | Remove a tool |
| `PUT` | `/software/:id/assignments` | Update member assignments for a tool |

#### Overheads
| Method | Path | Description |
|---|---|---|
| `GET` | `/overheads` | List all overhead items |
| `POST` | `/overheads` | Add an item |
| `PATCH` | `/overheads/:id` | Update an item |
| `PATCH` | `/overheads/:id/stop` | Set end date (stop accounting) |
| `PATCH` | `/overheads/:id/resume` | Clear end date |
| `DELETE` | `/overheads/:id` | Permanently delete |

#### Prospects
| Method | Path | Description |
|---|---|---|
| `GET` | `/prospects` | List all prospects (with linked estimate summary) |
| `GET` | `/prospects/:id` | Get full prospect detail |
| `POST` | `/prospects` | Create a prospect |
| `PATCH` | `/prospects/:id` | Update a prospect |
| `DELETE` | `/prospects/:id` | Delete a prospect |

#### Estimates
| Method | Path | Description |
|---|---|---|
| `GET` | `/estimates` | List all estimates |
| `GET` | `/estimates/:id` | Get estimate with allocations, exclusions, calculations |
| `POST` | `/estimates` | Create an estimate |
| `PATCH` | `/estimates/:id` | Update estimate settings |
| `PUT` | `/estimates/:id/allocations` | Replace team allocations |
| `PUT` | `/estimates/:id/exclusions` | Update software/overhead exclusions |
| `DELETE` | `/estimates/:id` | Delete an estimate |

#### Dashboard
| Method | Path | Description |
|---|---|---|
| `GET` | `/dashboard` | All aggregated dashboard data in one call |

> The dashboard endpoint does all aggregation server-side (won revenue, pipeline weights, partner splits, burn rate, runway) and returns the computed values. The frontend doesn't recalculate — it just renders.

### Error codes

```typescript
type ErrorCode =
  | 'UNAUTHORIZED'       // No/invalid JWT
  | 'FORBIDDEN'          // Valid JWT but not a studio member
  | 'NOT_FOUND'          // Resource doesn't exist
  | 'VALIDATION_ERROR'   // Request body failed schema validation
  | 'CONFLICT'           // e.g. duplicate role name
  | 'INTERNAL_ERROR'     // Unexpected server error
```

---

## 8. Frontend Architecture

### App Router structure

```
app/
├── layout.tsx                  # Root layout with ClerkProvider
├── middleware.ts               # Protects all (dashboard) routes
├── (auth)/
│   └── sign-in/page.tsx        # Clerk <SignIn /> component
└── (dashboard)/
    ├── layout.tsx              # Sidebar nav + Clerk session
    ├── page.tsx                # Dashboard
    ├── team/
    │   └── page.tsx            # Members, Roles, Software tabs
    ├── prospects/
    │   ├── page.tsx            # Prospects list
    │   └── [id]/page.tsx       # Prospect detail
    ├── estimates/
    │   ├── page.tsx            # Estimates list
    │   └── [id]/page.tsx       # Estimate detail (Cost Builder + Profit Calculator)
    └── settings/
        └── page.tsx            # Studio Profile (4 tabs)
```

### Data fetching pattern

Use **React Query (TanStack Query)** for all API calls:
- Automatic caching and background refetch
- Optimistic updates for quick UI response
- Shared query invalidation (e.g., updating a team member cost automatically refreshes the dashboard KPIs)

```typescript
// Example: prospects list
const { data: prospects } = useQuery({
  queryKey: ['prospects'],
  queryFn: () => api.get('/prospects'),
})

// Example: update with optimistic UI
const { mutate: updateProspect } = useMutation({
  mutationFn: (data) => api.patch(`/prospects/${id}`, data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prospects'] }),
})
```

### Calculation layer (`@studio/calc`)

The `packages/calc` package contains all pure calculation functions — the same logic from the MVP's JavaScript. These are imported by:
- **API** — to compute totals in the `GET /estimates/:id` and `GET /dashboard` responses
- **Web** — for instant live recalculation in the estimate builder as the user changes fields (before saving)

This avoids duplicating the logic or making an API round-trip on every input change in the estimate modal.

```javascript
// packages/calc/src/estimate.js
export function calcFixedEstimate(input) {
  // same logic as calcEst() in the MVP
}

export function calcTax(entity, grossProfit) {
  // same slab/flat rate logic
}

export function calcPartnerSplit(netProfit, partners) {
  // equity + exec/bdev premium logic
}
```

> **v1 note:** Until the estimate builder lives on the web side, the calc functions can stay inside `apps/api/src/lib/calc.js`. They get promoted to `packages/calc` only when the web app needs to import them for live recalculation in the estimate modal.

### State management

- **Server state:** React Query (API data)
- **UI state:** React `useState` / `useReducer` (modals open, active tab, form values)
- **No global store needed** — the app is not complex enough to warrant Zustand/Redux

---

## 9. File Storage

**Neon does not have native blob/object storage.** Neon is a PostgreSQL provider — it stores relational data, not files.

**Recommendation for v1: Skip file storage entirely.**  
The MVP had no file uploads and the v1 feature set doesn't require them. PDF exports are generated client-side (same as the MVP).

**If file storage becomes needed later (e.g., storing logo, signed contracts):**  
Use **Vercel Blob** — it's part of the same Vercel project, requires no additional account, and the SDK is a one-liner. Add it when the need arises.

```typescript
// Future: upload a file with Vercel Blob
import { put } from '@vercel/blob'
const blob = await put('studio-logo.png', file, { access: 'public' })
```

---

## 10. Deployment

### Both apps on Vercel

Vercel supports deploying multiple apps from the same Turborepo. You configure which app to deploy in each Vercel project.

**Project 1 — Web (Next.js)**
- Root directory: `apps/web`
- Build command: `cd ../.. && turbo build --filter=web`
- Output: `.next`

**Project 2 — API (Node.js + Express)**
- Root directory: `apps/api`
- Build command: none (plain JS) — Vercel runs `node server.js`
- Runtime: Node.js serverless function (single Express handler) on Vercel

> **Note:** Wrap the Express `app` with `serverless-http` (or export `module.exports = app`) so Vercel can mount it as a serverless function. If you outgrow serverless cold-starts, Railway is a good one-click alternative for the API only.

### Neon database branches

Use Neon's branching feature for different environments:

| Environment | Neon branch | Usage |
|---|---|---|
| Production | `main` | Live data |
| Preview | `preview` | Vercel preview deployments |
| Development | `dev-{name}` | Local development, one branch per developer |

Each branch has its own connection string — set them as env vars in Vercel per environment.

---

## 11. Environment Variables

### `apps/web/.env.local`
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/

# API
NEXT_PUBLIC_API_URL=https://api.frameworkstudio.in
```

### `apps/api/.env`
```env
# Database (Neon)
DATABASE_URL=postgresql://...?sslmode=require   # Pooled connection (Prisma)
DIRECT_URL=postgresql://...?sslmode=require      # Direct connection (migrations)

# Clerk
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...

# Studio
STUDIO_ORG_ID=org_...   # The Clerk org ID for Framework Studio

# Server
PORT=3001
NODE_ENV=production
```

---

## 12. Migrating from the MVP

The MVP stored everything in `localStorage` under key `fsv7`. A migration script reads the exported JSON and seeds the production database.

A seed file (`studio-seed-data.json`) is included alongside this document. To get the latest export from the MVP:
1. Open `http://localhost:8080`
2. Open DevTools console
3. Run: `copy(localStorage.getItem('fsv7'))`
4. Paste into `studio-seed-data.json`

### Migration script

```javascript
// apps/api/prisma/seed.js
const { PrismaClient } = require('@prisma/client')
const data = require('../../../studio-seed-data.json')

const prisma = new PrismaClient()

async function main() {
  console.log('Creating studio...')
  const studio = await prisma.studio.create({
    data: {
      name: data.settings.name,
      founderNames: data.settings.founder,
      email: data.settings.email,
      phone: data.settings.phone,
      gstin: data.settings.gstin,
      entity: mapEntity(data.settings.entity),
      gstRegistered: data.settings.gst === 'yes',
      workingDaysPerMonth: data.settings.wdays,
      workingHoursPerDay: data.settings.whours,
      clerkOrgId: process.env.STUDIO_ORG_ID!,
      pipelineProbLead: data.settings.pipelineProb?.Lead ?? 20,
      pipelineProbProposal: data.settings.pipelineProb?.['Proposal Sent'] ?? 50,
      pipelineProbNegotiating: data.settings.pipelineProb?.Negotiating ?? 75,
    }
  })

  // Roles
  const roleMap: Record<string, string> = {}
  for (const r of data.roles) {
    const role = await prisma.role.create({
      data: { studioId: studio.id, name: r.name, department: mapDept(r.dept) }
    })
    roleMap[r.id] = role.id
  }

  // Team members
  const memberMap: Record<string, string> = {}
  for (const m of data.team) {
    const member = await prisma.teamMember.create({
      data: {
        studioId: studio.id,
        name: m.name,
        roleId: m.role ? roleMap[data.roles.find(r => r.name === m.role)?.id ?? ''] : null,
        experience: m.exp,
        monthlyCost: m.cost,
        isActive: m.active !== false,
        isPartner: m.isPartner,
        equityPct: m.equityPct ?? 0,
        execPremPct: m.execPremPct ?? 0,
        bdevPremPct: m.bdevPremPct ?? 0,
      }
    })
    memberMap[m.id] = member.id
  }

  // Software + assignments
  for (const sw of data.software) {
    const tool = await prisma.softwareTool.create({
      data: {
        studioId: studio.id,
        name: sw.name,
        costPerSeat: sw.cost,
        isSharedLicence: sw.wholeTeam ?? false,
        startDate: sw.startDate ? new Date(sw.startDate) : null,
      }
    })
    for (const userId of (sw.users ?? [])) {
      if (memberMap[userId]) {
        await prisma.softwareAssignment.create({
          data: { softwareId: tool.id, memberId: memberMap[userId] }
        })
      }
    }
  }

  // Overheads
  for (const oh of data.settings.overheadItems ?? []) {
    await prisma.overheadItem.create({
      data: {
        studioId: studio.id,
        category: mapOHCategory(oh.category),
        label: oh.label,
        amount: oh.amount,
        startDate: oh.startDate ? new Date(oh.startDate) : null,
        endDate: oh.endDate ? new Date(oh.endDate) : null,
      }
    })
  }

  // Prospects
  const prospectMap: Record<string, string> = {}
  for (const p of data.prospects) {
    const prospect = await prisma.prospect.create({
      data: {
        studioId: studio.id,
        projectName: p.project,
        clientName: p.client,
        contactName: p.contact,
        email: p.email,
        phone: p.phone,
        website: p.url,
        domain: p.domain,
        stage: mapStage(p.stage),
        vsMode: p.valueSignals?.mode === 'revenue' ? 'REVENUE' : 'MATRIX',
        vsComplexity: p.valueSignals?.complexity ?? 2,
        vsImpact: p.valueSignals?.impact ?? 2,
        vsUrgency: mapUrgency(p.valueSignals?.urgency),
        vsCompetitive: mapCompetitive(p.valueSignals?.competitive),
        vsClientSize: mapClientSize(p.valueSignals?.clientSize),
        vsRevenueImpact: p.valueSignals?.revenueImpact ?? null,
      }
    })
    prospectMap[p.id] = prospect.id
  }

  // Estimates + allocations
  for (const e of data.estimates) {
    const estimate = await prisma.estimate.create({
      data: {
        studioId: studio.id,
        name: e.name,
        type: e.type === 'retainer' ? 'RETAINER' : 'FIXED',
        durationWeeks: e.weeks,
        margin: e.margin,
        commissionType: mapCommission(e.commission?.type),
        commissionCustomPct: e.commission?.customPct ?? null,
        contractValue: e.financials?.contract ? BigInt(e.financials.contract) : null,
        prospectId: e.id === 'e1' ? prospectMap['p1']
                  : e.id === 'e2' ? prospectMap['p2']
                  : e.id === 'e3' ? prospectMap['p3'] : null,
      }
    })

    for (const alloc of e.teamAlloc) {
      if (memberMap[alloc.memberId]) {
        await prisma.estimateAllocation.create({
          data: {
            estimateId: estimate.id,
            memberId: memberMap[alloc.memberId],
            allocationPct: alloc.alloc,
            weeks: alloc.weeks,
            margin: alloc.margin,
          }
        })
      }
    }
  }

  console.log('Migration complete ✓')
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

---

## 13. Development Setup

### Prerequisites
- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- A Neon account (free tier is enough)
- A Clerk account (free tier is enough)

### Steps

```bash
# 1. Create the monorepo
npx create-turbo@latest framework-studio
cd framework-studio

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
# Fill in Clerk keys, Neon DATABASE_URL, STUDIO_ORG_ID

# 4. Generate Prisma client
pnpm --filter @studio/database db:generate

# 5. Run database migrations
pnpm --filter @studio/database db:migrate

# 6. Seed with MVP data
pnpm --filter @studio/database db:seed

# 7. Start everything
pnpm dev
# Runs web on :3000 and api on :3001 concurrently
```

### `package.json` scripts (root)
```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "db:migrate": "pnpm --filter @studio/database db:migrate",
    "db:generate": "pnpm --filter @studio/database db:generate",
    "db:seed": "pnpm --filter @studio/database db:seed",
    "db:studio": "pnpm --filter @studio/database db:studio"
  }
}
```

---

## 14. v1 Scope & Out of Scope

### In scope (feature parity with MVP minus invoicing)

| Module | Notes |
|---|---|
| Dashboard — KPIs, 5 sections, layout customisation | ✅ |
| Studio Expenses — Members, Roles, Software tabs | ✅ |
| Studio Profile — overheads, pipeline probs, FY review | ✅ |
| Prospects — pipeline, value signals, stage management | ✅ |
| Estimates — fixed + retainer, cost builder, overhead exclusions, commission | ✅ |
| Value-based pricing tiers (from prospect signals) | ✅ |
| Estimate locking at non-Lead stages | ✅ |
| Profit calculator — P&L waterfall, tax by entity, partner split | ✅ |
| PDF export (client-facing estimate) | ✅ |
| FY review notifications | ✅ |
| Auth — 2–4 members, invite-only via Clerk | ✅ |

### Out of scope for v1

| Feature | Reason |
|---|---|
| Invoicing | Explicitly removed |
| File uploads (logo, contracts) | Not needed for v1 |
| Real-time collaboration | Not required |
| Backup export / import | Data is now in a real DB — no need |
| Time tracking | Future feature |
| Retainer billing calendar | Future feature |
| Profit vs. actuals reconciliation | Future feature |
| Notes / activity timeline on prospects | Future feature |
| Multi-tenant (multiple studios) | Not in scope |

---

## Appendix: Naming Map (MVP → Production)

| MVP (`localStorage`) | Production (Prisma) | Notes |
|---|---|---|
| `S.settings.name` | `Studio.name` | |
| `S.settings.entity` | `Studio.entity` (enum) | `llp` → `LLP` |
| `S.settings.gst` | `Studio.gstRegistered` (bool) | `'yes'` → `true` |
| `S.settings.wdays` | `Studio.workingDaysPerMonth` | |
| `S.settings.overheadItems[]` | `OverheadItem[]` | |
| `S.team[].cost` | `TeamMember.monthlyCost` | |
| `S.team[].isPartner` | `TeamMember.isPartner` | |
| `S.software[].wholeTeam` | `SoftwareTool.isSharedLicence` | |
| `S.prospects[].project` | `Prospect.projectName` | |
| `S.prospects[].valueSignals.complexity` | `Prospect.vsComplexity` | |
| `S.estimates[].teamAlloc[].alloc` | `EstimateAllocation.allocationPct` | |
| `S.estimates[].excludedSw[]` | `EstimateExclusion.softwareId` | array → join table |
| `S.estimates[].excludedOH[]` | `EstimateExclusion.overheadId` | array → join table |
| `S.estimates[].commission.type` | `Estimate.commissionType` (enum) | |
| `S.estimates[].financials.contract` | `Estimate.contractValue` (BigInt) | |
| `S.invoices[]` | — | Removed |

---

*This document is the source of truth for the production build. Update it as decisions change.*
