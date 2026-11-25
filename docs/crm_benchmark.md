# CRM Benchmark: Zoho CRM vs HubSpot CRM vs Frappe CRM vs Nexus

> Research note comparing the three reference CRMs against this project, and the
> feature gap that drove the implementation work in this cycle.
> Sources: official vendor pages (zoho.com/crm, hubspot.com) and a source-level
> read of the cloned `frappe-crm` repository in this repo.

---

## 1. Executive summary

| | Zoho CRM | HubSpot CRM | Frappe CRM | Nexus (this repo) |
|---|---|---|---|---|
| **Shape** | Module-based closed platform | Object-based extensible platform | Self-hosted, Frappe/PostgreSQL | Self-hosted, Node + MongoDB |
| **Free tier** | 3 users, full CRM | 2 users, 1,000 contacts | Unlimited (self-hosted) | Unlimited (self-hosted) |
| **Entry price** | Free / Standard per user/mo | Free / Starter per seat/mo | Infrastructure + hosting | Infrastructure + hosting |
| **Extensibility** | Custom modules, Functions, Canvas, Client Scripts, Zoho Flow | Custom objects, custom properties, programmable automation | Custom DocTypes, custom fields, hooks, client scripts | Custom fields engine, pipeline config, module toggles |
| **Strength** | Deepest automation + BI of the three | Best usability + inbound marketing suite | Ownership, no vendor lock-in, no per-seat cost | Small, understandable codebase |

**The one-line difference.** Zoho and HubSpot both assume you rent their platform and
accept their data model; Frappe assumes you run it yourself and own the schema. This
project sits in the Frappe camp: a self-hosted, tenant-scoped CRM where the domain
model is data, not code.

---

## 2. Zoho CRM — feature anatomy

From the official feature and pricing pages:

**Editions.** Free (3 users) → Standard → Professional → Enterprise → Ultimate.
Each tier adds capability rather than seats, which is why Zoho is usually cheaper
per seat than HubSpot at the top end.

**Organisational model — the distinctive idea.** Zoho splits users into two
licence classes:

- **Org users** (sales reps, managers, admins) — full CRM access.
- **Team users** (marketing, support, legal, finance) — full control *inside their
  own team modules*, but only partial access to org modules: they can add notes,
  tags and attachments to records in up to ten org modules and view public custom
  views, but they **cannot** own records, reach reports and dashboards, initiate
  calls, create automations, or use the AI features.

This is a licensing model built around partial trust, and it is worth copying as a
*design pattern* even without the commercial framing: a role that can annotate
records but not own them is a real and common requirement.

**Capability map.**

| Area | What Zoho ships |
|---|---|
| AI | Zia: AI agents for sales, generative AI, deal-outcome prediction, anomaly detection, email intent/sentiment analysis |
| Sales force automation | Forecasting, pipeline, territory management, CPQ, workflows |
| Lead management | Lead capture (web forms), enrichment, nurturing, omnichannel |
| Process automation | Cadences (branching follow-up sequences), Blueprint (process definition), Page Layouts, Kiosk Studio (no-code guided screens), Journey Orchestration |
| Customisation | Canvas (page designer), Client Scripts, Layouts, Portals, CRM for Everyone (team workspaces) |
| BI | Dynamic dashboards, prompt-driven report generation, proactive anomaly detection |
| Commerce/ops | Inventory management, quotes, invoices, purchase orders, vendors (Professional+) |
| Enterprise | Multi-team management, reporting hierarchy, custom buttons and Functions, extended field types, sequential data collection (wizards), approval process, ABM, developer sandbox, field-level encryption |
| Platform | CRM Plus adds help desk, live chat, email marketing, social, surveys, project management |

**Notable absences.** Zoho has no email campaign builder in the CRM itself (it is
CRM Plus / Zoho Mail), no product catalogue with line items in the base CRM, and
no territory *hierarchy* for reps beyond the Enterprise territory module.

---

## 3. HubSpot CRM — feature anatomy

From the official product and pricing pages:

**Tiers.** Free (2 users, 1,000 contacts) → Starter → Professional → Enterprise.
HubSpot gates by *capability*, and the gates are sharp:

| Tier | Adds |
|---|---|
| Free | Contact management, deal pipelines, CRM import, Breeze Assistant, reporting dashboard |
| Starter | Required fields, permission sets, multiple currencies, HubSpot branding removal |
| Professional | AI customer agent, **duplicate management**, standard contact scoring, **calculated properties**, custom reporting |
| Enterprise | **Custom objects**, organise teams, SSO, **field-level permissions** |

The three Professional/Enterprise features that matter most architecturally are
**custom objects** (your own tables, not just extra fields), **calculated
properties** (derived fields on records), and **field-level permissions**
(per-property read/write control). Zoho's equivalent is custom modules plus
extended field types.

**The rest of the platform.** HubSpot is really a bundle: Marketing Hub (forms,
landing pages, ads, email marketing, workflows, lead management, A/B testing),
Sales Hub (sequences, meetings, calls, tasks, quotes, line items, products, CPQ,
deal pipelines, forecasting, call transcription, AI prospecting agent), Service
Hub (tickets, shared inbox, knowledge base, SLAs), Content Hub, Data Hub (sync,
quality, enrichment), Revenue Hub, and Smart CRM. Breeze is the AI layer.

**HubSpot's real differentiator** is that a free HubSpot account also includes
lead generation, form builder, landing pages, ads, lead management, AI email
writer, email marketing, meeting scheduler and live chat. That is a deliberately
aggressive free tier.

**Notable absences.** HubSpot has no equivalent of Zoho's *team* vs *org* user
licensing, no territory management outside the Operations Hub, and its workflow
engine is not as visual as Zoho's Blueprint.

---

## 4. Frappe CRM — feature anatomy (from the cloned source)

`frappe-crm/` is a fork of `frappe/crm` with three extra modules: **FCRM**,
**Lead Syncing** and **Domain Enrichment**. It is a Frappe v15/v16 Python app with
a Vue 3 + `frappe-ui` SPA.

**Domain model.** Every business record is a DocType with a JSON schema:
`CRM Lead`, `CRM Deal`, `CRM Organization`, `CRM Task`, `FCRM Note`,
`CRM Call Log`, `CRM Product`, `CRM Territory` (nested set), `CRM Sales Hierarchy`
(nested set), plus config doctypes: `CRM Deal Status`, `CRM Lead Status`,
`CRM Lost Reason`, `CRM Lead Source`, `CRM Industry`, `CRM Communication Status`.

**Three patterns worth stealing outright:**

1. **Stages are data.** `CRM Deal Status` is a DocType with `deal_status`,
   `color`, `position`, `probability` and `type` (`Open / Ongoing / On Hold / Won /
   Lost`). Deal probability is *derived* from the stage, not typed by hand. The
   same idea drives `CRM Lead Status` and `CRM Fields Layout` (which stores the
   whole form layout as JSON).

2. **Scoring is a policy, not a field.** `crm/automation/scoring.py` clamps and
   writes `lead_score`; `reference_flows.py` encodes a concrete policy: business
   email +15, named organisation +10, senior title +15, ≥201 employees +10, inbound
   source +20 / outbound +5; engagement: Contacted +5, Nurture +10, Qualified +20,
   Unqualified −30. Bands: ≥50 hot, ≥25 warm, else cold.

3. **Automation is event-driven.** `crm/automation/events.py` emits typed events
   (`crm.deal_stage_changed`, `crm.lead_qualified`, `crm.prospect_message_received`,
   `crm.task_overdue`, …) and Frappe's Automation Engine subscribes to them.
   Actions are classes: `AdjustLeadScore`, `SetLeadTemperature`,
   `ConvertLeadToDeal`, `SendEmailToRecord`, `SendCRMNotification`.

**Where Frappe is thinner than the commercial products:** no email campaign
builder, no unsubscribe or open-tracking, no line-item order model, no territory
assignment engine beyond a nested set, no product catalogue pricing, no customer
portal.

**What Frappe does have that neither Zoho nor HubSpot exposes as a first-class
primitive:** a per-doctype *layout* store (`CRM Fields Layout`) that is plain JSON,
and a *view settings* store (`CRM View Settings`) that holds column selection,
filters, grouping, kanban columns and ordering per user. Both are cheap to
implement and immediately make a CRM feel like a product rather than a demo.

---

## 5. Side-by-side capability matrix

Legend: ● full · ◐ partial · ○ absent

| Capability | Zoho | HubSpot | Frappe | Nexus before | Nexus after |
|---|---|---|---|---|---|
| Contacts / accounts / leads | ● | ● | ● | ◐ (no lead states) | ● |
| Deal pipeline, drag-and-drop board | ● | ● | ● | ◐ (no DnD) | ● |
| Stages configurable by the user | ● | ● | ● | ○ (hardcoded ×4) | ● |
| Stage probability drives the forecast | ● | ● | ● | ○ (manual slider) | ● |
| Multiple pipelines | ● | ● | ○ | ○ | ● |
| Time-based / period forecast | ● | ● | ◐ | ○ | ● |
| Forecast categories (commit / best case) | ● | ● | ○ | ○ | ○ |
| Territory / rep hierarchy | ● Enterprise | ◐ | ◐ nested set | ○ | ○ |
| Custom fields | ● | ● | ● | ◐ (deals only) | ◐ (deals only) |
| Custom objects / modules | ● | ● Enterprise | ● DocTypes | ○ | ○ |
| Calculated properties | ● | ● Professional | ● | ○ | ○ |
| Field-level permissions | ● Enterprise | ● Enterprise | ● | ○ | ○ |
| Role based access control | ● | ● | ● | ● (3 roles) | ● |
| Record ownership scoping | ● | ● | ● | ○ | ○ |
| Audit / property history | ● | ● | ● Version | ○ | ● |
| Workflow automation | ● | ● | ◐ events | ○ | ● |
| Lead scoring / rating | ● | ● | ● | ○ | ● |
| Email campaign builder | ◐ CRM Plus | ● | ○ | ◐ (hardcoded body) | ◐ (templates added) |
| Email templates | ● | ● | ● | ○ | ● |
| Unsubscribe + suppression list | ● | ● | ○ | ○ (dead `#` link) | ● |
| WhatsApp / SMS / telephony | ● | ◐ | ● Twilio/Exotel | ○ (env only) | ○ |
| Product catalogue + line items | ● | ● | ● | ○ | ○ |
| Quotes / invoices / payments | ● | ● | ◐ ERPNext | ○ | ○ |
| Data import | ● | ● | ● | ○ | ○ |
| Reporting dashboards | ● | ● | ◐ | ◐ | ◐ |
| API + webhooks + API keys | ● | ● | ● | ◐ (no keys/webhooks) | ◐ |
| Embedded AI | ● Zia | ● Breeze | ○ | ◐ Gemini | ◐ Gemini |
| Global search | ● | ● | ● | ◐ (nav-only) | ● |
| Saved views / filters | ● | ● | ● View Settings | ○ | ○ |
| i18n | ● 28 languages | ● | ● | ○ | ○ |
| Multi-tenancy | ○ (orgs) | ○ (portals) | ○ (sites) | ● | ● |

---

## 6. What this cycle implemented, and why

Every item below was chosen because it closes a gap that *both* Zoho and HubSpot
already treat as table stakes, and where the reference implementation (Frappe) had
a clear, proven pattern to copy.

### 6.1 Data-driven pipelines and stages
*Ported from Frappe's `CRM Deal Status` doctype; matches Zoho "multiple sales
pipelines" and HubSpot pipelines.*

- New `Pipeline` collection: ordered stages, each with `key`, `label`, `color`,
  `position`, `probability` and `type` (`open` / `won` / `lost`).
- `Deal.stage` became free-form and every stage is validated against the
  tenant's pipeline. A stage that does not exist is a `400`, not a silent no-op.
- **Probability is now derived from the stage** unless the caller overrides it,
  which is what makes the weighted forecast trustworthy. Moving a deal to a lost
  stage resets probability to 0; moving to won sets 100 and stamps `closedDate`.
- A lost deal **requires** a reason — the same guard Frappe enforces through
  `validate_lost_reason()`.
- The stage list was previously hardcoded in **four** places (the Mongoose enum,
  `business.settings.pipelineStages`, `Pipeline.jsx`, `DealDetailDrawer.jsx`).
  It is now one source of truth served by `GET /api/pipelines`.
- Removing a stage that still has deals is refused with a `409`.

### 6.2 Time-based forecasting
*Ported from Frappe's `get_forecasted_revenue()`; matches Zoho sales forecasting.*

`GET /api/deals/forecast?months=6&granularity=month|quarter` buckets open pipeline
by expected close period and reports pipeline value, **weighted** value, won value
and lost value per period, using a Mongo aggregation rather than a Node loop.

### 6.3 Pipeline summary via aggregation
The previous implementation loaded **every deal in the tenant into Node memory**
on each request, contradicting the design doc's claim of `$group`/`$sum`/`$facet`.
It is now a single `$facet` aggregation returning stage, per-owner and total
breakdowns — plus a **per-owner** rollup (Zoho territory-adjacent reporting) and
the **loss-reason breakdown** that was already being computed but never rendered.

### 6.4 Lead lifecycle and scoring
*Ported from Frappe's `crm_lead.py` and `scoring.py`; matches Zoho Lead Management
and HubSpot lead management.*

- `Customer` gained `status` (lead → contacted → qualified → customer → churned),
  `source`, `leadScore`, `temperature` and `convertedAt`.
- A scoring policy (business email, linked company, order count, lifetime spend)
  produces a 0-100 score and a cold/warm/hot band, recalculated automatically on
  every write — including when an order raises a customer's value.
- `POST /api/customers/:id/convert` promotes a lead to a paying customer;
  `POST /api/customers/:id/rescore` recomputes on demand.
- New **Leads** page with hot/warm/cold buckets, filters and conversion actions.

### 6.5 Audit trail
*Ported from HubSpot property history and Frappe's `Version` doctype.*

- New `AuditLog` collection records `create` / `update` / `delete` with a
  field-level before/after diff, the actor, role, IP and user agent.
- The deal drawer timeline now merges notes, stage transitions, linked tasks **and**
  audit entries, so "who changed the value from 10k to 50k, and when" is answerable.
- `GET /api/audit` provides a tenant-wide activity feed.

### 6.6 Email templates, unsubscribe and suppression
*Matches Zoho / HubSpot email marketing compliance, which Frappe lacks.*

- `EmailTemplate` collection: reusable subject and body with `{{token}}`
  personalisation (`name`, `firstName`, `email`, `totalSpend`, `totalOrders`,
  `company`, `unsubscribeUrl`).
- A **450-line hardcoded HTML email** was replaced by a reusable renderer
  (`services/campaignEmail.ts`) with inline, mail-client-safe styling.
- Every campaign email now carries a `List-Unsubscribe` header and a working
  one-click unsubscribe link, signed with an HMAC over the tenant and the
  recipient address. The link is stateless: no record has to exist before the
  campaign is sent.
- A `Suppression` collection records unsubscribes, bounces and complaints.
  Suppressed recipients are logged as `SKIPPED` rather than mailed, and the
  suppression list is manageable from the API.

### 6.7 Workflow automation
*The largest remaining functional gap, and the one all three reference CRMs share.*

A workflow watches for a domain event, checks a condition, and runs a list of actions.

**Event model.** Fifteen events across deals, contacts, tasks, notes and campaigns:
`deal.created`, `deal.updated`, `deal.stage_changed`, `deal.won`, `deal.lost`,
`customer.created`, `customer.updated`, `customer.status_changed`,
`customer.converted`, `task.created`, `task.completed`, `task.overdue`,
`note.created`, `campaign.sent`. The names follow Frappe's `crm.deal_stage_changed`
convention.

**Conditions use a small expression language, not `eval`.** `backend/utils/expression.ts`
implements a recursive descent parser that produces an AST, and an evaluator that
walks it. Nothing is ever compiled to code, and `__proto__`, `constructor` and
`prototype` are refused as path segments. The grammar covers comparisons, `&&`,
`||`, `!`, `in` / `not in` (including object key membership), arithmetic, array
literals and parentheses:

```
doc.value >= 50000 && doc.stage == 'negotiation'
doc.lostReason in ['Pricing', 'Competitor Won']
'closedDate' in doc
```

Conditions are validated when a workflow is saved, and there is a "Check" button
in the editor that validates an expression without saving.

**Ten actions:** create a task, update the record, send an email, send a
notification, assign the record, adjust the lead score, set the lead temperature,
create a deal, add a note, and wait. Each action publishes a parameter schema, so
the editor renders its form from the catalogue rather than hardcoding it.

**Wait steps make real sequences possible.** A wait action parks the run with a
resume time stored in MongoDB, and a scheduler resumes it later. Because the
state is in the database rather than in memory, a restart does not lose a
sequence.

**Runs are recorded.** Every execution writes a `WorkflowRun` with the trigger
context, the per-step outcome and the error, so a failed automation can be
inspected rather than guessed at. `GET /api/workflows/runs` is a tenant-wide
activity feed.

**Starter workflows** ship with a new workspace, based on Frappe's reference
flows: a welcome sequence, a high value deal watch, a qualified lead scoring
rule, a post-mortem on a lost deal and a stalled deal follow-up. They are created
**disabled** — a workflow that sends mail should be a deliberate choice.

**In-app notifications** (`Notification` collection) with a bell in the header,
polled every thirty seconds.

### 6.8 Pagination and a consistent list envelope
*Every list endpoint returned the entire tenant dataset.*

All list endpoints now return `{ <collection>, pagination: { page, limit, total,
totalPages, hasNext, hasPrev } }` with a bounded `limit` (max 200). The pipeline
summary and forecast use aggregations instead of loading collections into memory.

### 6.9 Global search
The command palette (Cmd/Ctrl+K) only matched navigation entries. It now queries
`GET /api/search` across contacts, deals, accounts and tasks, and shows both record
results and page results.

---

## 7. Defects found and fixed

These were live bugs, not theoretical ones. The index problems were found by
running the new code against the real database, not by reading the source.

| Defect | Impact | Fix |
|---|---|---|
| `users.googleId` had a **non-sparse** unique index | **Every email/password signup after the first failed** with a duplicate key error. The `sparse: true` was declared on the schema path but the stored index was not sparse, and every non-Google user was saved as `googleId: null`. | Partial unique index (`$type: 'string'`) plus an idempotent boot migration that drops the conflicting index and recreates it |
| `customers.email` had a **global** unique index | Two workspaces could not hold the same contact address | Compound unique `{ business, email }`; migration drops the global index |
| Campaign segmentation never worked | The frontend sent `spent` / `orders` while the backend read `totalSpend` / `totalOrders`, **and** the request sanitiser stripped every `$`-prefixed key so `$gt` never reached the controller. The feature either targeted every customer or none. | A closed, vendor-neutral rule DSL (`{ totalSpend: { gte: 1000 } }`) with server-side validation, plus a server-side audience preview endpoint so preview and launch use the same query |
| `GET /api/tasks?dealId=` ignored the filter | The deal drawer showed **every** task in the tenant | `dealId`, `customerId`, `assignedTo`, `overdue` and `search` filters implemented |
| Profile page called `/api/auth/me` | The backend mounts auth at `/auth`, so the page always errored | A second axios instance for non-`/api` routes |
| AI endpoints had no authentication | Anyone could spend the Gemini quota | `protect` + `authorize` on both AI routes |
| `demoLogin` was enabled in production | One-click admin access to a real tenant | Blocked in production unless `ALLOW_DEMO_LOGIN` is set |
| `gemini-2.0-flash` was retired | Every AI call failed with a 404 | Ordered model fallback list, with the model configurable via `GEMINI_MODEL` |
| Growth insights fallback loop was unbounded | The request could hang forever when a fallback line was already present | Bounded fill |
| Health check compared heap to host RAM | The 85% degradation threshold could never fire | RSS against total memory |
| Morgan response-time token always logged `0` | Every access log showed a zero duration | A start-time stamp middleware |
| Organisation search interpolated raw input into `$regex` | A malformed pattern returned a 500 | Regex escaping on every user-supplied pattern |
| Stale organisation-scoped customer cache | Filtered contact lists were stale for the full TTL | Both cache keys invalidated on every write |
| Dashboard summary was never invalidated | Revenue figures were up to five minutes stale | Invalidated on customer and order writes |
| `Campaign` and `CommunicationLog` used `businessId` for the tenant | Inconsistent with the other eight models | `business` field added, legacy value backfilled by migration |
| `Deal.stage` was a Mongo enum | Custom stages were impossible | Free-form string validated against the pipeline |
| `stageHistory[].stage` had no enum | A malformed stage could enter the history | Validated at the controller |
| Loss reasons were computed but never rendered | The analysis was collected and discarded | Rendered on the pipeline board |
| `frontend/src/components/Navbar.jsx`, `utils/getUser.js`, `backend/utils/httpLogger.ts` | Dead code | Removed |

---

## 8. Roadmap, in priority order

Ordered by the ratio of customer value to effort, based on the matrix above.

**Next (highest value):**

1. ~~**Workflow automation.**~~ **Done.** A trigger/action engine over the domain
   events, with a safe expression language, ten actions, wait steps, a run log and
   in-app notifications. See §6.7.
   *Still worth doing:* multi-step branching (the current engine branches only
   through a per-step condition), re-enrolment rules, and a visual flow canvas.
2. **Custom objects.** A generic collection with its own field definitions, so a
   tenant can track "Subscriptions" or "Renewals" without a schema change. The
   custom-field engine already stores field definitions as data, so this is an
   extension of existing machinery rather than a new subsystem. The workflow
   engine already has the `entity` concept a custom object would plug into.
3. **Custom fields on every entity.** Custom fields currently render on the deal
   form and drawer only. Extending them to contacts, accounts, tasks and orders
   reuses the existing definition store.
4. **Record ownership scoping.** `assignedTo` exists on deals and tasks but is
   never used as an access boundary, so a manager can edit another rep's records.
   Zoho's org/team split and HubSpot's permission sets both solve this properly.
5. **Product catalogue with line items.** Orders are currently a bare amount.
   Quotes, invoices and payments follow from it.

**Then:**

6. **Data import** (CSV upload, field mapping, dedup on import) — Frappe's
   `Data Import` and HubSpot's importer are the references.
7. **Saved views and filters.** Frappe's `CRM View Settings` is a cheap,
   high-impact addition: store column selection, grouping, filters and kanban
   columns per user.
8. **Territory and assignment rules.** Lead routing, round-robin assignment and a
   rep hierarchy (Frappe's `CRM Sales Hierarchy` nested set).
9. **Global search improvements** — full-text index, fuzzy matching, cross-entity
   ranking, saved searches.
10. **Field-level permissions and custom roles.** Both Zoho Enterprise and HubSpot
    Enterprise sell this; the current three roles are too coarse for a large team.
11. **i18n.** Zoho ships 28 languages; every string in this app is hardcoded
    English and every currency is hardcoded `₹`/`INR` even though
    `business.settings.currency` is already stored and fetched.
12. **Forecasting categories** (commit / best case / pipeline) and **forecast
    report periods**, which both Zoho and HubSpot have and neither Frappe nor this
    project does.

**Explicitly out of scope for a self-hosted Node CRM:** AI agents that execute
sales activities (Zoho), a full customer service desk (HubSpot Service Hub),
CPQ with price rules, and the marketplace / plugin ecosystem. Those are business
models, not features.

---

## 9. Security notes

- `backend/.env` in this environment contains a weak, human-readable
  `JWT_SECRET` (`shinkhalsinha`) and a live Gemini API key. The file is
  gitignored, but the secret should be rotated and generated randomly before any
  deployment, because it also signs the unsubscribe tokens and the session and
  refresh tokens.
- `connect-redis` v9 is being handed an Upstash HTTP client in
  `config/session.ts`. The construction is wrapped in a try/catch that silently
  falls back to the in-memory session store, so **Redis-backed sessions most
  likely are not in use**. Worth verifying before relying on server-side session
  revocation.
- Helmet's default Content Security Policy is enabled but not configured for this
  app's asset origins.
- The `Link-Unsubscribe` header is now emitted on campaign mail, and suppression
  is enforced server side.
