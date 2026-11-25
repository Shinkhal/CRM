# Production hardening — 2026-11-25

The authentication, campaign delivery, frontend session, and dependency findings from the production review have been addressed locally. This is not evidence of a deployed production environment.

## Behavior changes

- Google sign-in uses a random, expiring, session-bound state value. The callback consumes that state and returns to `/auth-success` without a bearer token in the URL. The frontend obtains its access token through the httpOnly refresh cookie.
- Invitation acceptance checks the exact pending token and role. New invited accounts and invitation consumption are committed in one MongoDB transaction. Team responses no longer expose invitation bearer tokens.
- Refresh sessions are stored in MongoDB with hashed token values and an expiry index. Refresh atomically rotates the token; replay is rejected. Logout deletes the session. Already-issued access tokens retain their existing 15-minute lifetime.
- The production demo flag accepts explicit booleans: `false`, `0`, or empty disables it; `true` or `1` enables it. Leave it disabled for production.
- Frontend refresh is shared across concurrent requests and publishes new tokens to React. Web Locks serialize rotation across tabs where supported. Logout waits for an in-flight exchange before revoking its session and prevents that response from restoring local authentication.
- Campaign creation persists the message. Delivery uses the saved message or the explicitly selected template. Empty segments remain persisted, so targeting the entire tenant works.
- `POST /api/logs/simulate` now returns HTTP 202 with a job ID. It enqueues a real send; it is not an email simulation. The campaign ID uniquely identifies its immutable delivery job. Repeated submissions return the existing job. Already-sent legacy campaigns cannot be resent through this endpoint.
- A background worker processes persisted recipient snapshots, atomically claims recipients, rechecks suppression before sending, and projects outcomes into delivery logs idempotently. Pending work survives restart. A send interrupted after its claim is marked `UNKNOWN` after five minutes and is not automatically retried. Campaigns with uncertain outcomes show `needs_review`.
- SMTP acceptance is not proof of inbox delivery. Consult provider records before creating a replacement campaign for an uncertain recipient. This deliberately avoids claiming exactly-once SMTP delivery.
- Campaign audiences over 5,000 are rejected rather than silently truncated. Queued campaigns cannot be edited or deleted while delivery is pending.
- Route-level frontend code splitting removes the previous oversized-chunk warning. Authentication contexts and hooks are split to remove frontend lint warnings.
- Dependency security patches include the Google SDK, Nodemailer, Axios, Mongoose, routing/build dependencies and tsx. The SDK request uses its current `config` field and initializes only when AI is requested.

## Deployment implications

1. Deploy frontend and backend together. Old refresh cookies are intentionally invalid: existing users must sign in again.
2. MongoDB must be a replica set or compatible managed cluster for invitation transactions. Allow the `RefreshSession` TTL index and campaign job index to be created.
3. Keep a backend process running: its campaign worker polls MongoDB. Multiple processes coordinate recipient claims through MongoDB. A scale-to-zero host cannot process work while all instances are stopped.
4. Set public HTTPS URLs, the frontend build-time `VITE_BACKEND_URL`, allowed origins, separate signing secrets, and production Upstash session credentials. Validate secure cookies and OAuth redirects on the actual deployment domains.
5. Confirm live Google OAuth, SMTP delivery and Gemini requests in staging. Tests use a synthetic Google profile, local SMTP sink, and a local Redis HTTP-protocol stub; they do not verify vendor credentials or provider behavior.
6. Existing backend `any` lint warnings remain technical debt. They are not suppressed; strict TypeScript compilation and lint error checks pass.

## Reproducing checks

From `backend`:

```sh
npm run build
npm run lint
node --import tsx tests/expression.test.ts
npm audit
```

For isolated integration regressions, start a disposable MongoDB replica set on loopback port 27028:

```sh
podman run --detach --rm --name crm-production-tests -p 127.0.0.1:27028:27017 docker.io/library/mongo:8 --replSet crmtest --bind_ip_all
podman exec crm-production-tests mongosh --quiet --eval 'rs.initiate({_id:"crmtest",members:[{_id:0,host:"localhost:27017"}]})'
# Wait for the replica set to elect its primary, then from backend:
npm run test:production
podman stop crm-production-tests
```

The test suite uses a process-specific database, synthetic credentials, a local SMTP sink, and a local Redis protocol stub. It drops only its isolated test database. It also runs the existing smoke, workflow and suppression scripts against its temporary HTTP server.

From `frontend`:

```sh
npm run build
npm run lint
npm audit
VITE_BACKEND_URL=http://127.0.0.1:5999 npm run dev -- --host 127.0.0.1 --port 5178
# In another terminal, from frontend; requires Chrome (override CHROME_BIN if needed):
npm run test:browser
```

The browser test intercepts the synthetic backend URL and checks OAuth landing, concurrent 401 refresh, rendered user-context updates, and logout during refresh. No real account is used.

## Observed validation

- Backend and frontend production builds passed.
- Frontend lint: zero errors and warnings. Backend lint: zero errors; existing `any` warnings remain.
- Expression suite: 16 passed.
- Isolated integration suite: 11 tests passed, including the original smoke (47 assertions) and workflow (48 assertions) suites and updated asynchronous suppression test. The legacy smoke suite has a conditional viewer check that skips when its workspace has no viewer.
- npm dependency audits: zero reported vulnerabilities after updates.
- Chrome browser checks passed with synthetic backend responses; live provider and deployment validation remains outstanding.
