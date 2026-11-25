![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js\&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4ea94b?logo=mongodb\&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis\&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react\&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript\&logoColor=white)

# 🧠 Nexus CRM — Modular Multi-Tenant CRM Platform

A full-stack, multi-tenant CRM built with Node.js + Express + TypeScript + MongoDB
and a React 19 + Vite + Tailwind v4 frontend. It ships a data-driven sales pipeline,
lead lifecycle with automatic scoring, a field-level audit trail, marketing campaigns
with templates and one-click unsubscribe, and a Gemini-powered insights layer.

The domain model was designed against a benchmark of Zoho CRM, HubSpot CRM and
Frappe CRM — see **[docs/crm_benchmark.md](docs/crm_benchmark.md)** for the
comparison, the feature gap analysis, and the roadmap.

---

See [production hardening and deployment notes](docs/production-hardening.md) for the authentication/session migration, persisted campaign delivery, and isolated regression commands.

## 📚 Documentation

| Document | Contents |
|---|---|
| **[docs/crm_benchmark.md](docs/crm_benchmark.md)** | Zoho vs HubSpot vs Frappe vs Nexus: capability matrix, what was implemented this cycle, the defects that were found and fixed, and the prioritised roadmap |
| **[docs/system_design.md](docs/system_design.md)** | Multi-tenant architecture, ER model, MongoDB schema, Redis caching, RBAC, security |
| **[docs/features_and_userflows.md](docs/features_and_userflows.md)** | Feature catalog and end-to-end user flows |
| **[docs/walkthrough.md](docs/walkthrough.md)** | Guided walkthrough of the product surface |
| **[docs/backend_review.md](docs/backend_review.md)** | Senior engineering review of the backend: the critical defects that were found, what was fixed, and what is still open |

---

## ✨ Core Capabilities

### 🎯 Data-driven sales pipeline
* Pipeline stages live in the database, not in code. Rename them, reorder them, and
  set the win probability that drives the forecast — exactly like Zoho's "multiple
  sales pipelines" and Frappe's `CRM Deal Status` doctype.
* Stage probability **drives** the weighted forecast; moving a deal to a lost stage
  resets it to 0 and a won stage stamps the close date.
* A lost deal **requires** a reason, and the loss analytics are rendered on the board.
* Drag and drop between columns, plus per-owner pipeline rollups.
* **Forecast view** buckets open pipeline by expected close period, monthly or quarterly.

### ⚡ Workflow automation
* When something happens, do something. A workflow watches for a domain event,
  checks a condition, and runs a list of actions.
* **Fifteen events** across deals, contacts, tasks, notes and campaigns:
  `deal.stage_changed`, `deal.won`, `customer.converted`, `task.overdue`,
  `campaign.sent` and more.
* **Conditions use a small expression language, not `eval`.** A recursive descent
  parser produces an AST and an evaluator walks it; prototype access is refused.
  ```
  doc.value >= 50000 && doc.stage == 'negotiation'
  doc.lostReason in ['Pricing', 'Competitor Won']
  ```
* **Ten actions**: create a task, update the record, send an email, send a
  notification, assign the record, adjust the lead score, set the lead
  temperature, create a deal, add a note, and **wait**.
* **Wait steps make real sequences.** A run parked on a wait resumes from the
  database, so a restart does not lose the sequence.
* **Every run is recorded** with the trigger context and the per-step outcome,
  so a failed automation can be inspected rather than guessed at.
* **Five starter workflows** ship with a new workspace, based on the reference
  flows in Frappe CRM. They are created **disabled** — a workflow that sends
  mail should be a deliberate choice.
* In-app notifications with a bell in the header.

### 🔥 Lead lifecycle and scoring
* Every contact starts as a lead: `lead → contacted → qualified → customer → churned`.
* Score (0-100) and band (cold / warm / hot) are recalculated from business email,
  linked company, order count and lifetime spend — on every write.
* One-click conversion from lead to paying customer.

### 🗂️ Field-level audit trail
* Every create, update and delete on a deal, contact, account, task, note or campaign
  is recorded with a before/after field diff, the actor, role, IP and user agent.
* The deal drawer timeline merges notes, stage transitions, linked tasks and audit
  entries into one chronological feed.

### 📣 Marketing campaigns that actually target
* Segment rules use a closed, vendor-neutral DSL: `{ "totalSpend": { "gte": 5000 } }`.
  No raw Mongo operators ever reach the request body, so the NoSQL-injection
  sanitiser can stay strict *and* segmentation keeps working.
* Server-side audience preview, so the preview and the launch use the same query.
* Reusable **email templates** with `{{name}}`, `{{company}}`, `{{totalSpend}}` style
  personalisation.
* Every send carries a `List-Unsubscribe` header and a **signed one-click unsubscribe
  link**. Suppressed recipients are logged as `SKIPPED`, never mailed.

### 🏛️ B2B accounts and contact linkage
* Accounts with industry, headcount, revenue and address.
* Contacts link to accounts, and account pages roll up contact count, deal count and
  pipeline value.

### ✅ Tasks, notes and activity
* Tasks with status, priority, due date, assignee and links to both a contact and a
  deal. Filtering by `dealId` / `customerId` works.
* Notes with pinning, merged into the same activity timeline as the audit trail.

### ⚙️ Custom fields engine
* Admins define fields on deals, contacts and accounts at runtime; the definitions
  are stored as data and rendered on the deal form and drawer.

### 🧩 Module marketplace
* Feature toggles per workspace, enforced in the sidebar, the home launchpad and the
  navigation palette.

### 🔐 Authentication and access
* Email/password with **argon2id**, Google OAuth 2.0, and a one-click demo sandbox.
* Access token (15 min) + refresh token in an httpOnly cookie (7 days).
* Three roles — `admin`, `manager`, `viewer` — enforced on every route.
* `/auth/demo-login` is **blocked in production** unless `ALLOW_DEMO_LOGIN` is set.

---

## 🧑‍🤝‍🤝 Roles

| Role | Capabilities |
|---|---|
| `admin` | Full control: manage modules, custom fields, pipeline stages, team, campaigns, delete records, AI reports |
| `manager` | Manage contacts, accounts, deals, tasks, campaigns, notes; create pipeline stages |
| `viewer` | Read-only across the workspace, plus viewing reports and dashboards |

> There is no `owner` role. `Business.owner` is a field that points at the admin who
> created the workspace.

---

## 🛠️ Stack

| Layer | Stack |
|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS v4, React Router 7, lucide-react, react-toastify |
| Backend | Node.js, Express 5, TypeScript 6, Mongoose 8, MongoDB, Redis (Upstash / ioredis) |
| AI | Google Gemini (`gemini-3.8-flash`, with a model fallback chain) |
| Messaging | Nodemailer (SMTP), WhatsApp API variables reserved |
| Auth | argon2id, jsonwebtoken, Passport.js (Google OAuth 2.0) |
| Session | connect-redis with an in-memory fallback |
| Logging | Winston (console + rotating files) |

---

## 🗂️ Structure

```text
/backend
├── config/         db, redis, session, passport, cors, env (zod validated)
├── controllers/    one per resource, plus pipeline, audit, search, email template,
│                   workflow, notification
├── middleware/     auth (protect / authorize), rate limit, security
├── models/         mongoose schemas (tenant scoped)
├── routes/         express routers
├── services/       pipeline, campaign email, AI, email sender, workflow engine
├── utils/          pagination, segment rules, audit, migrations, logger, health
├── types/          shared types
├── tests/          end-to-end smoke tests against a running server
└── server.ts

/frontend
├── api/            axios instances + collection helpers
├── components/     AppLayout, Sidebar, TopHeader, drawers, modals, ui kit
├── context/        AuthContext, UserContext
├── hooks/          usePipeline (stages from the API)
├── pages/          20 routed pages
├── routes/         PrivateRoute, AdminRoute
└── styles/
```

---

## 🧪 Local setup

### Backend

```bash
cd backend
npm install
cp .env.example .env   # or create .env from the table below
npm run dev
```

Required environment variables (validated by zod at boot — the process refuses to
start with an invalid configuration):

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=xeno-crm
REDIS_URL=redis://...
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000
ALLOWED_ORIGINS=http://localhost:5173
SESSION_SECRET=...          # at least 32 characters, and all three
JWT_SECRET=...               # signing secrets must differ from
REFRESH_TOKEN_SECRET=...     # each other
SESSION_COOKIE_NAME=crm.sid
SESSION_TTL_HOURS=24
TRUST_PROXY=0                # only enable behind a reverse proxy
BODY_LIMIT=1mb
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_GLOBAL_MAX=1500
RATE_LIMIT_AUTH_MAX=200
RATE_LIMIT_AI_MAX=300
```

Optional:

```env
GOOGLE_GEMINI_API_KEY=...    # AI segmentation, message generation, growth insights
GEMINI_MODEL=gemini-3.8-flash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
WHATSAPP_API_URL=...         # reserved, not wired up yet
WHATSAPP_API_KEY=...         # reserved, not wired up yet
ALLOW_DEMO_LOGIN=            # only ever set this outside production
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

```env
VITE_BACKEND_URL=http://localhost:5000
```

➡️ [http://localhost:5173](http://localhost:5173)

### Verification

```bash
cd backend  && npm run typecheck   # tsc --noEmit in strict mode, zero errors
cd backend  && npm run lint        # eslint, zero errors
cd backend  && npm run test        # 115 assertions across 4 suites
cd backend  && npm run typecheck:strict  # strict-mode readiness report
cd frontend && npm run lint        # eslint, zero errors
cd frontend && npm run build       # vite production build
```

The backend compiles with **TypeScript strict mode enabled**. `npm run
typecheck:strict` checks the full backend with strict TypeScript settings. Lint reports remaining explicit `any` usage.

The tests exercise the real API against the real database. Together they cover
registration, pipeline stage derivation, stage validation, loss reasons, the
aggregation-backed pipeline summary, the forecast, the audit trail, task
filtering, campaign segmentation, lead conversion, global search, the
authentication guards, and the whole workflow engine: trigger matching, trigger
filters, conditions, per-step conditions, action execution, failure handling,
wait steps, run-now, notifications and the enable/disable switch.

---

## 🧭 Known gaps

Honest list of what is **not** built yet, tracked in the roadmap section of
`docs/crm_benchmark.md`:

* Multi-step branching in workflows (the engine branches only through a
  per-step condition), re-enrolment rules, and a visual flow canvas
* Custom objects, and custom fields on every entity
* Record ownership scoping (`assignedTo` is not yet an access boundary)
* Product catalogue, quotes, invoices, line items
* Data import / export, saved views, field-level permissions, custom roles, i18n
* WhatsApp / SMS / telephony delivery (the environment variables exist, the
  integration does not)
* File attachments

---

## 👨‍💻 Author

**Shinkhal Sinha**

---

## 📝 License

Open-source project for learning and portfolio demonstration.
