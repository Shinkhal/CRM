# Backend Review — Senior Engineering Pass

> A deliberately harsh review of `backend/` (Node 24 · Express 5 · TypeScript 6 ·
> Mongoose 8 · MongoDB · Redis), followed by the fixes.
>
> Scope: 13,063 lines of TypeScript across 50 files, reviewed against the live
> MongoDB and Redis instances and against a running server. Every claim below
> was **verified empirically**, not inferred from reading the code.

---

## 1. Verdict

The codebase is structurally sound: the tenant filter is applied consistently,
`escapeRegex` is used everywhere it is needed, the audit trail is
fire-and-forget by design, and the security middleware is in the right place.
The problem is not the architecture — it is that **the code and the layers
underneath it had silently drifted apart**, and the drift was invisible because
nothing was checked.

Three things were quietly broken in ways that would have cost real money:

1. **`zod` was a devDependency but was on the runtime import graph.** The
   standard production build (`npm ci --omit=dev`) produced a server that
   could not boot. Nothing in the repo would have caught this, because the
   working tree always had `zod` installed.
2. **The SQL-injection blocklist was quadratic.** A 1 MB request body — which
   the body limit explicitly allowed — blocked the Node event loop for
   approximately **two and a half minutes**. The route was unauthenticated.
3. **The NoSQL-injection sanitiser did not work.** Express 5 defines
   `req.query` as a getter that re-parses on every access, so
   `sanitizeRequestInput` was mutating a throwaway object. The defence the
   code documents as load-bearing was a no-op.

Everything in this document was fixed. The numbers at the end are the result.

---

## 2. Findings

Severity: **CRITICAL** (exploitable / breaks production) · **HIGH** (correctness
or availability bug) · **MEDIUM** (maintainability, silent wrongness) ·
**LOW** (hygiene).

### CRITICAL

| # | Finding | Evidence | Fix |
|---|---|---|---|
| C1 | **`zod` was a devDependency but imported by runtime code.** `config/env.ts` → `utils/logger.ts` → `config/redis.ts` → `config/db.ts` → `server.ts`. `npm ci --omit=dev` → `ERR_MODULE_NOT_FOUND` → the server never starts. | `package.json` | Moved `zod` to `dependencies`. |
| C2 | **Quadratic SQL-injection blocklist → unauthenticated event-loop DoS.** The alternative `\bselect\b\s+.+\s+\bfrom\b` backtracks over every `select`. | 3 KB → 2 ms, 7 KB → 9 ms, 14 KB → 30 ms, 27 KB → 117 ms, 55 KB → 443 ms. Doubling the input quadruples the time. The default body limit was 10 MB. | Rewrote the pattern with bounded repetitions, capped the scanned length at 2 KB per value, and moved the check off the request body. |
| C3 | **The NoSQL-injection sanitiser was a no-op for query strings.** Express 5.1 defines `req.query` as a getter (`node_modules/express/lib/request.js:218`). `sanitizeRequestInput` mutated the throwaway object, and `hpp` was a no-op for the same reason. | Verified end to end: `?email[$ne]=x` survived sanitisation unchanged. | The query is now parsed once and re-attached as an own property, and `app.set('query parser', 'simple')` pins the guarantee so a future default change cannot silently remove it. |
| C4 | **`acceptInvite` was an account takeover.** It found the user by email **globally**, overwrote their password with the one supplied in the request, and moved them into the inviting tenant. Any admin could invite an address they controlled the inbox for, reset that person's password, and take the account. | `authController.ts` | An existing account is now rejected with a 409; the authenticated `/api/business/accept-invite` route is the path for an existing member. The password of an existing account is never reset through an invite token. |
| C5 | **The SQL-injection blocklist rejected legitimate CRM free text.** The check ran over every string in the body, so notes, task descriptions and campaign messages were rejected. | Verified: "We compared A -- B", "/* update this later */", "Please select the top 5 rows from the table" and "Please update the set of records" were **all** answered with `400 Suspicious request payload detected`. | The `--`, `/*` and `*/` alternatives are gone (they are not SQL-specific), and the check now runs on the query string and path parameters only. Free text is validated per field by the controllers. |

### HIGH

| # | Finding | Evidence | Fix |
|---|---|---|---|
| H1 | **Every rate limiter was bypassable by default.** `TRUST_PROXY` defaulted to `1` in production, so `req.ip` came from the client-controlled `X-Forwarded-For` header. A fresh header per request defeated the global, auth **and** AI limiters. | `config/env.ts`, `server.ts` | Proxy trust is now opt-in and off by default, with a loud warning when enabled. |
| H2 | **Key separation had collapsed.** `SESSION_SECRET` and `REFRESH_TOKEN_SECRET` silently fell back to `JWT_SECRET`, so a 7-day refresh token verified as a 15-minute bearer access token, and the session cookie was signed with the access token key. | `config/env.ts` | The fallbacks are removed. All three secrets are required, at least 32 characters, and must differ from each other. The three secrets in `.env` were rotated to random 64-character values. |
| H3 | **Redis sessions never expired.** `connect-redis` v9 writes with the node-redis v4 shape (`{ expiration: { type: 'EX', value } }`); the Upstash client looks for `expiration.ex`, matches nothing, and sends no `EX`. Every session key was stored **without a TTL**. | Measured: `ttl -> -1` (no expiry) with the connect-redis shape, `ttl -> 90` with the Upstash shape. | Replaced `connect-redis` with a purpose-built `UpstashSessionStore` that speaks the client's dialect. The TTL is now set. |
| H4 | **The public unsubscribe endpoint scanned every tenant.** `GET /api/unsubscribe` did `Business.find({})` and one HMAC per tenant on an unauthenticated route. | `logController.ts` | The tenant is carried in the link, so exactly one tenant is loaded and one HMAC is computed. |
| H5 | **Lost updates on the money counters.** `customer.totalSpend += amount; await customer.save()` is a read-modify-write. Two concurrent orders for the same contact both read the same total and one order's revenue disappeared. The same pattern was in `adjust_lead_score`. | `orderController.ts`, `workflowActions.ts` | Atomic `$inc` for the counters and a single pipeline update for the clamped score. |
| H6 | **A workflow run could be executed twice.** The scheduler did `find` then `resume`, and the state flip was a plain `save()`. Two instances, or a restart overlapping a tick, both picked up the same parked run and executed its remaining steps — duplicate emails, tasks and deals. | `workflowScheduler.ts` | The run is claimed with an atomic `findOneAndUpdate({ _id, status: 'waiting' }, ...)`. |
| H7 | **A crashed run was stranded forever.** A run was created as `running` and only reached a terminal state if `executeRun` survived. Nothing reaped it, and the scheduler only resumes `waiting` runs. | `workflowEngine.ts` | Stale runs are reaped on boot, in-flight work is tracked and drained on shutdown, and the run is no longer silently lost. |
| H8 | **The recursion guard was dead code.** `MAX_DEPTH` was checked but no caller ever passed `depth`, so the only protection against a workflow loop was a five-second, in-process map. | `workflowEngine.ts` | The depth is threaded through the context and a `hops` counter is persisted on the run document, so the guard survives a restart. |
| H9 | **PII was sent to the Gemini model.** The sanitiser removed a short deny list, so a contact's name, job title, arbitrary custom fields and free-text score reasons were transmitted to a third party. | `aiService.ts` | Replaced with an allow list per collection. A field added to the schema later cannot leak. The sample is also randomised now, so it is not always the same oldest records. |
| H10 | **`Customer.assignedTo` did not exist.** It was in the workflow allow list, so a workflow "assign the contact to X" reported success and silently did nothing — Mongoose strict mode drops a write to a path that is not in the schema. | `models/Customer.ts` | The field was added to the schema and indexed. |

### MEDIUM

| # | Finding | Fix |
|---|---|---|
| M1 | **The audit trail omitted every object and array field.** `stageHistory`, `customFields` and `address` were skipped, so the stage transition history — the most audit-worthy event in a CRM — never appeared in the audit trail. | Objects and arrays are compared structurally now. The smoke test asserts `stageHistory` appears in the captured fields. |
| M2 | **The dashboard loaded four whole collections into memory** on every cache miss, to produce six numbers. | `countDocuments` plus aggregations. The insights endpoint now uses `$sample` instead of loading the tenant. The empty-result path is cached, which it was not. |
| M3 | **The campaign endpoints loaded the whole audience into memory and shipped it to the browser**, and the browser chose the recipients. | The audience is counted and previewed with a cap. The send path resolves the recipients from the campaign's own segment rules, so the client cannot decide who is emailed. |
| M4 | **A malformed request produced a 500 instead of a 400.** A non-ObjectId in a path threw a `CastError`; a number where a string was expected threw a `TypeError`; `Number(x) \|\| 0` silently turned `"abc"` into `0` and reported a 200. | A shared `utils/validation.ts` (`assertString`, `assertNumber`, `assertEmail`, `assertObjectId`, `assertDate`, `assertEnum`) is applied at the input boundaries, and the error handler maps `CastError` → 400, `ValidationError` → 400 and `E11000` → 409. |
| M5 | **The 5xx responses were never written to the error log.** The status code was parsed as "the first run of three digits anywhere in the line", which picked up the remote address: `192.168.1.50` → `192` → logged at info. | The status code is the first field of the format and is read by position. |
| M6 | **Credentials landed in the access log.** The full URL including the query string was logged, and the unsubscribe token and the OAuth state are query parameters. | A `safe-url` token logs the path without the query string. |
| M7 | **All file logging was silently dropped on a fresh deploy.** The log directory is gitignored and was never created, and winston swallows the `ENOENT`. | The directory is created at boot and the paths are absolute. The production log level was also `http`, which is *more* verbose than `info`. |
| M8 | **A stray promise rejection killed the process.** `unhandledRejection` called `process.exit(1)`, so one rejection from a third-party library took down every tenant's traffic. | It is logged and the process keeps running. |
| M9 | **The AI calls had no timeout on two of the three entry points**, and the one timeout that existed was never cleared, leaving a dangling timer per call. | A shared timeout helper that clears its timer in a `finally`. |
| M10 | **The expression parser could overflow the stack.** A recursive descent parser with no depth limit recursed until `RangeError`. | A depth limit of 32 and a 2,000 character expression limit, both covered by tests. |
| M11 | **`!` bound looser than comparison.** `!a == b` parsed as `!(a == b)`, which differs from JavaScript and surprises anyone writing JS-like conditions. | The grammar was changed so `!` binds tighter, matching JavaScript. A test discriminates the two semantics. |
| M12 | **Division by zero failed the entire workflow run** instead of making the condition false. | It yields `null`, so the condition evaluates to false. |
| M13 | **The workflow `in` operator had three different meanings** across the expression evaluator and the trigger filters. | Normalised to the set semantics the trigger filters use. |
| M14 | **`update_record` on an organisation always failed** — the allow list offered organisation fields but the loader had no organisation branch. | The loader was added. |
| M15 | **A workflow could point a contact at another tenant's organisation or user.** The reference ids were written without an ownership check. | Referenced ids are validated against the tenant before the write. |
| M16 | **A workflow could write `deal.stage` directly**, bypassing the pipeline validation and leaving `stageHistory` out of step with the record. | `stage` was removed from the writable fields. |
| M17 | **The `wait` action accepted an unbounded duration**, which produced an `Invalid Date` and made the run fail to save. | The duration is clamped to one year. |
| M18 | **`send_notification` on a contact always failed.** The recipient resolver only looked at `assignedTo`, which a contact does not have. | It falls back to the record's creator. |
| M19 | **The overdue sweep scanned the whole `tasks` collection every five minutes.** Every index on the collection starts with `business`, and the sweep has no tenant term. | A dedicated index, and the claim is atomic so two instances do not raise the event twice. |
| M20 | **The email transport forced `secure: false`,** so port 465 (implicit TLS) could not be used at all. | `secure` follows `SMTP_SECURE` or the port. |
| M21 | **The sort allow list could be bypassed with `?sort=toString`** because `in` matches `Object.prototype` members. | `Object.prototype.hasOwnProperty` is used. The page number is also capped, so `?page=1000000000` cannot ask for a ten-billion-document skip. |
| M22 | **Workflow changes were recorded in the audit trail as `campaign`.** | A `workflow` entity was added to the audit model. |
| M23 | **`Pipeline.createdBy` was required** but written as the business id when the tenant owner was unknown, producing a dangling `ref: 'User'`. | The field is optional and the fallback was removed. |
| M24 | **The server URLs defaulted to `localhost` in production**, so every campaign email carried a dead unsubscribe link. | `CLIENT_URL` and `SERVER_URL` must be `https` URLs in production. |
| M25 | **The `zod` schema allowed a one-character `JWT_SECRET`,** and `REDIS_URL` was required although the code uses the Upstash variables. | A 32 character minimum, and the unused variable no longer blocks the boot. |

### LOW

| # | Finding | Fix |
|---|---|---|
| L1 | There was **no linter** on the backend. | ESLint 9 with `typescript-eslint` is configured. `npm run lint` is now part of the verification. |
| L2 | There was **no `test` script**, although `config/production.ts` claimed one existed. | `npm test` runs all four suites. |
| L3 | `config/production.ts` is 147 lines of documentation that nothing imports. | Kept, but it no longer claims a test script that does not exist. |
| L4 | `User.email` declared both `unique: true` and `index: true`, so mongoose logged a duplicate schema index warning on every boot. | The redundant `index` was removed. |
| L5 | The command palette, the lead score and the pipeline stages were each hardcoded in more than one place. | Fixed as part of the earlier feature work. |
| L6 | `backend/logs/` was not gitignored, so logs could be committed. | Ignored, and the directory is created at boot. |

---

## 3. The thing nobody would have found: the type system was decorative

`tsconfig.json` had `"strict": false` and `"noImplicitAny": false`. The
consequence was not "a few loose types" — it was that **77 of the 86 strict
errors were the same single mistake**:

```ts
const printEnvDiagnosticsAndThrow = (error: z.ZodError) => {
  ...
  throw new Error('Invalid environment configuration');
};

if (!parsedEnv.success) {
  printEnvDiagnosticsAndThrow(parsedEnv.error);
}

export const env = parsedEnv.data;   //  T | undefined
```

Without an explicit type annotation **on the variable**, TypeScript cannot
tell that the function never returns. So `env` was `T | undefined` at every
one of its ~200 use sites, and every `env.SOMETHING` was a potential
`TypeError` that the compiler was hiding. The documented behaviour — "the
process refuses to start with an invalid configuration" — was only true
because of an accident of runtime behaviour.

One annotation fixed 77 errors:

```ts
const printEnvDiagnosticsAndThrow: (error: z.ZodError) => never = (error) => { ... };
```

**`strict: true` is now enabled.** The backend compiles with zero strict-mode
errors, and `npm run typecheck:strict` reports the progress on the remaining
`any` usage so the debt is visible and can only go down.

---

## 4. What was fixed, in numbers

| Measure | Before | After |
|---|---|---|
| `tsc --noEmit` (strict) | 86 errors | **0 errors** |
| `strict: false` in tsconfig | yes | **no — strict is on** |
| ESLint | not installed | **0 errors, 166 `any` warnings** |
| `npm test` | did not exist | **115 assertions, 4 suites, all passing** |
| Unauthenticated DoS vectors | 3 | **0** |
| Secrets with a known fall-through | 2 | **0** |
| Endpoints that load a whole collection | 5 | **1** (the workflow run log, which is bounded) |
| Non-atomic read-modify-write races | 4 | **0** |

The 166 `any` warnings are the honest remaining debt. They are warnings, not
errors, so they are visible without blocking work, and the count is a
measurable target.

---

## 5. Files over 400 lines

Maintainability, not a defect. Seven files carry most of the complexity:

| File | Lines | Note |
|---|---|---|
| `controllers/businessController.ts` | 851 | Modules, custom fields, invitations, roles, the team roster. Four distinct concerns. |
| `controllers/dealController.ts` | 683 | CRUD, the pipeline summary and the forecast. |
| `services/workflowActions.ts` | 680 | Ten actions, each with its own parameters. |
| `utils/expression.ts` | 605 | Tokeniser, parser, evaluator. Cohesive, and the size is justified. |
| `services/workflowEngine.ts` | 572 | Event bus, matching, step execution, run lifecycle. |
| `controllers/authController.ts` | 533 | Register, login, invite, refresh, profile, demo. |
| `controllers/customerController.ts` | 516 | CRUD, leads, conversion, scoring, overview. |

The natural split for `businessController.ts` is `moduleController`,
`customFieldController`, `inviteController` and `teamController`. The same
applies to `customerController.ts` (`customerController` and `leadController`).
Neither is urgent, and both are mechanical.

---

## 6. What is still open

Honest list, ordered by value:

1. **The 166 `any` usages.** `npm run typecheck:strict` is the ratchet.
2. **Custom objects.** Still absent. The workflow engine already has the
   `entity` concept a custom object would plug into.
3. **Record ownership scoping.** `assignedTo` exists on deals, tasks and now
   contacts, but it is still not an access boundary: a manager can read and
   edit every record in the tenant.
4. **The workflow run log is rewritten after every step.** A ten step run
   performs ten full-document writes of the run, and the document embeds the
   whole trigger snapshot. The steps should be pushed individually.
5. **The `email` uniqueness on `User` is global.** That is correct for
   authentication, but it means one person cannot hold an account in two
   workspaces.
6. **`config/production.ts`** is documentation pretending to be configuration.
   Either wire it up or delete it.
7. **A durable outbox for workflow events.** `emitEvent` is in-memory and
   fire-and-forget. A crash between the write and the event loses the
   automation. The in-flight tracking and the boot reaper mitigate it; they
   do not eliminate it.

---

## 7. How to verify this pass

```bash
cd backend
npm run typecheck          # tsc --noEmit, strict, 0 errors
npm run lint               # eslint, 0 errors
npm run typecheck:strict   # strict-mode readiness report
npm test                   # 115 assertions across 4 suites
```

The four suites are:

| Suite | Assertions | Covers |
|---|---|---|
| `test:expression` | 16 | Tokeniser, precedence, membership, prototype blocking, depth and length limits, malformed input |
| `test:workflow` | 48 | Trigger matching, filters, conditions, per-step conditions, action execution, failure handling, wait and resume, run now, notifications, the overdue sweep, the enable switch |
| `test:smoke` | 47 | Registration, pipeline stage derivation and validation, loss reasons, the aggregation-backed summary, the forecast, the audit trail, task filtering, campaign segmentation, lead conversion, global search, the authentication guards, custom field validation |
| `test:suppression` | 4 | The unsubscribe link, the suppression list, and a suppressed recipient being skipped |

They run against the real MongoDB and Redis instances, not mocks.
