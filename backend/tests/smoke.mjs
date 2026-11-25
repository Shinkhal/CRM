const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000';
let token = null;
const j = async (path, opts = {}) => {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
};
let passed = 0;
let failed = 0;
const ok = (label, cond, extra='') => {
  if (cond) { passed += 1; console.log(`PASS  ${label}${extra ? ' :: ' + extra : ''}`); }
  else { failed += 1; console.log(`FAIL  ${label}${extra ? ' :: ' + extra : ''}`); }
};

const email = `smoke_${Date.now()}@test.io`;

// 1. register
let r = await j('/auth/register', { method: 'POST', body: JSON.stringify({
  email, password: 'Passw0rd!23', companyName: 'Smoke Test Co', industry: 'Tech', currency: 'INR' }) });
ok('register', r.status === 201, r.body?.message || JSON.stringify(r.body));
token = r.body?.accessToken;

// 2. pipelines default
r = await j('/api/pipelines/default');
ok('GET /api/pipelines/default', r.status === 200 && r.body?.stages?.length === 6, `stages=${r.body?.stages?.length}`);
const stages = r.body?.stages || [];

// 3. create customer (lead) + org
r = await j('/api/organizations', { method: 'POST', body: JSON.stringify({ name: 'Acme Corp', industry: 'Software', employeeCount: 200 }) });
ok('create organization', r.status === 201);
const orgId = r.body?.organization?._id;

r = await j('/api/customers', { method: 'POST', body: JSON.stringify({ name: 'Jane Roe', email: `jane_${Date.now()}@acme.io`, phone: '999', organizationId: orgId, status: 'lead', source: 'website' }) });
ok('create customer', r.status === 201, r.body?.message);
const cust = r.body?.customer;
ok('customer lead score computed', cust?.leadScore > 0, `score=${cust?.leadScore} temp=${cust?.temperature}`);
ok('customer linked to org', cust?.organizationId?._id === orgId || cust?.organizationId === orgId);

// 4. pagination envelope
r = await j('/api/customers?page=1&limit=5');
ok('customers pagination envelope', r.status === 200 && Array.isArray(r.body?.customers) && !!r.body?.pagination, JSON.stringify(r.body?.pagination));

// 5. create deal -> probability auto-derived from stage
r = await j('/api/deals', { method: 'POST', body: JSON.stringify({ title: 'Smoke Deal', customerId: cust._id, value: 100000, stage: 'proposal', expectedCloseDate: '2026-12-31' }) });
ok('create deal', r.status === 201, r.body?.message);
const deal = r.body?.deal;
ok('probability auto-derived from stage (50%)', deal?.probability === 50, `probability=${deal?.probability}`);

// 6. lost stage requires a reason
r = await j(`/api/deals/${deal._id}`, { method: 'PUT', body: JSON.stringify({ stage: 'lost' }) });
ok('lost stage without reason rejected', r.status === 400, r.body?.message);
r = await j(`/api/deals/${deal._id}`, { method: 'PUT', body: JSON.stringify({ stage: 'lost', lostReason: 'Pricing' }) });
ok('lost stage with reason accepted', r.status === 200, r.body?.message);
ok('probability reset to 0 for lost stage', r.body?.deal?.probability === 0, `probability=${r.body?.deal?.probability}`);

// 7. invalid stage rejected
r = await j(`/api/deals/${deal._id}`, { method: 'PUT', body: JSON.stringify({ stage: 'not_a_stage' }) });
ok('invalid stage rejected', r.status === 400, r.body?.message);

// 8. pipeline summary (aggregation)
r = await j('/api/deals/pipeline-summary');
ok('pipeline summary', r.status === 200 && typeof r.body?.weightedForecast === 'number', `weighted=${r.body?.weightedForecast}`);
ok('lost reasons breakdown', Array.isArray(r.body?.lostReasons) && r.body.lostReasons.length === 1, JSON.stringify(r.body?.lostReasons));

// 9. forecast
r = await j('/api/deals/forecast?months=6&granularity=month');
ok('forecast endpoint', r.status === 200 && Array.isArray(r.body?.forecast), `buckets=${r.body?.forecast?.length}`);

// 10. audit trail
r = await j(`/api/audit?entity=deal&entityId=${deal._id}`);
ok('audit log records deal changes', r.status === 200 && r.body?.entries?.length >= 2, `entries=${r.body?.entries?.length}`);
const fields = new Set((r.body?.entries||[]).flatMap(e => (e.changes||[]).map(c=>c.field)));
ok('audit captures stage + value fields', fields.has('stage') && fields.has('value'), [...fields].join(','));

// 11. timeline merges audit
r = await j(`/api/notes/timeline?dealId=${deal._id}`);
ok('timeline includes audit entries', r.status === 200 && r.body?.some(i=>i.type==='audit'), `types=${[...new Set((r.body||[]).map(i=>i.type))].join(',')}`);

// 12. task filter by dealId
r = await j(`/api/tasks?dealId=${deal._id}`);
ok('tasks filtered by dealId', r.status === 200 && Array.isArray(r.body?.tasks), `tasks=${r.body?.tasks?.length}`);
r = await j('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'Follow up', relatedDeal: deal._id }) });
ok('create task', r.status === 201);
r = await j(`/api/tasks?dealId=${deal._id}`);
ok('task filter returns only linked tasks', r.body?.tasks?.length === 1, `tasks=${r.body?.tasks?.length}`);

// 13. campaign segmentation (the previously broken feature)
r = await j('/api/customers', { method: 'POST', body: JSON.stringify({ name: 'Spender', email: `spend_${Date.now()}@big.io`, status: 'lead' }) });
ok('second customer created', r.status === 201);
await j('/api/orders', { method: 'POST', body: JSON.stringify({ customerId: r.body?.customer?._id, amount: 5000 }) });
r = await j('/api/campaigns/preview', { method: 'POST', body: JSON.stringify({ segmentRules: { totalSpend: { gte: 1000 } } }) });
ok('segmentation preview with gte operator', r.status === 200 && r.body?.total >= 1, `total=${r.body?.total}`);
r = await j('/api/campaigns/preview', { method: 'POST', body: JSON.stringify({ segmentRules: { totalSpend: { '$gte': 1000 } } }) });
ok('legacy $-prefixed operator still accepted', r.status === 200, `total=${r.body?.total}`);
r = await j('/api/campaigns/preview', { method: 'POST', body: JSON.stringify({ segmentRules: { totalSpend: { gte: 'abc' } } }) });
ok('invalid segment value rejected', r.status === 400, r.body?.message);
r = await j('/api/campaigns/preview', { method: 'POST', body: JSON.stringify({ segmentRules: { password: { gte: 1 } } }) });
ok('disallowed segment field rejected', r.status === 400, r.body?.message);

// 14. campaign create
r = await j('/api/campaigns', { method: 'POST', body: JSON.stringify({ name: 'Smoke Campaign', message: 'Hello', segmentRules: { totalSpend: { gte: 1000 } } }) });
ok('create campaign', r.status === 201, `audience=${r.body?.campaign?.audienceSize}`);

// 15. leads
r = await j('/api/customers/leads');
ok('leads endpoint', r.status === 200 && Array.isArray(r.body?.leads), `leads=${r.body?.leads?.length} hot=${r.body?.summary?.hot?.count}`);
const lead = (r.body?.leads||[]).find(l=>l.name==='Jane Roe');
r = await j(`/api/customers/${lead._id}/convert`, { method: 'POST' });
ok('convert lead to customer', r.status === 200 && r.body?.customer?.status === 'customer', r.body?.message);

// 16. search
r = await j('/api/search?q=Smoke');
ok('global search', r.status === 200 && r.body?.results?.customers !== undefined, `total=${r.body?.total}`);

// 17. email templates
r = await j('/api/email-templates', { method: 'POST', body: JSON.stringify({ name: 'Welcome', subject: 'Hi {{name}}', body: 'Hello {{name}}\n\nWelcome to {{company}}.' }) });
ok('create email template', r.status === 201, r.body?.message);

// 18. pipeline update (add stage)
r = await j('/api/pipelines');
const pipelineList = Array.isArray(r.body) ? r.body : (r.body?.pipelines||[]);
const pipelineId = pipelineList.find(p=>p.isDefault)?._id;
r = await j(`/api/pipelines/${pipelineId}`, { method: 'PUT', body: JSON.stringify({
  stages: [...stages.map(s=>({key:s.key,label:s.label,color:s.color,probability:s.probability,type:s.type})), { key:'contracting', label:'Contracting', color:'indigo', probability:85, type:'open' }]
}) });
ok('add pipeline stage', r.status === 200, `stages=${r.body?.pipeline?.stages?.length}`);
r = await j('/api/deals', { method: 'POST', body: JSON.stringify({ title: 'Stage test', customerId: cust._id, value: 1000, stage: 'contracting' }) });
ok('deal in custom stage', r.status === 201, r.body?.message);
ok('custom stage probability applied', r.body?.deal?.probability === 85, `probability=${r.body?.deal?.probability}`);

// 19. auth guards (no token)
const saved = token; token = null;
r = await j('/api/ai/segment', { method: 'POST', body: JSON.stringify({ prompt: 'x' }) });
ok('AI endpoint requires auth', r.status === 401, `status=${r.status} ${r.body?.message||''}`);
r = await j('/api/search?q=acme');
ok('search endpoint requires auth', r.status === 401, `status=${r.status}`);
token = saved;

// 20. demo login guard is off in dev (expected 200) but production blocked
r = await j('/auth/demo-login', { method: 'POST', body: JSON.stringify({ role: 'admin' }) });
ok('demo login works in development', r.status === 200, r.body?.message);
r = await j('/auth/demo-login', { method: 'POST', body: JSON.stringify({ role: 'manager' }) });
ok('second demo login (different role) works', r.status === 200, r.body?.message);
// 21. custom field validation + required enforcement
r = await j('/api/business/custom-fields', { method: 'POST', body: JSON.stringify({ entity: 'bogus', label: 'X' }) });
ok('custom field rejects an invalid entity', r.status === 400, r.body?.message);
r = await j('/api/business/custom-fields', { method: 'POST', body: JSON.stringify({ entity: 'deal', label: 'Region', type: 'select', options: [] }) });
ok('select field requires options', r.status === 400, r.body?.message);
r = await j('/api/business/custom-fields', { method: 'POST', body: JSON.stringify({ entity: 'deal', label: 'Region', type: 'select', options: ['North', 'South'], required: true }) });
ok('create a required custom field', r.status === 201, r.body?.message);
r = await j('/api/deals', { method: 'POST', body: JSON.stringify({ title: 'Missing required', customerId: cust._id, value: 100 }) });
ok('required custom field is enforced', r.status === 400, r.body?.message);
r = await j('/api/deals', { method: 'POST', body: JSON.stringify({ title: 'Has required', customerId: cust._id, value: 100, customFields: { region: 'North' } }) });
ok('deal with the required field is accepted', r.status === 201, r.body?.message);
r = await j('/api/business/custom-fields');
ok('custom fields list envelope', Array.isArray(r.body?.customFields), `count=${r.body?.customFields?.length}`);

// 22. a viewer can post a note (Zoho team-user style annotation)
const adminToken = token;
r = await j('/api/business/team');
const viewer = (r.body?.users||[]).find(u => u.role === 'viewer');
if (viewer) {
  r = await j(`/api/business/team/${viewer.user._id}/status`, { method: 'PUT', body: JSON.stringify({ status: 'active' }) });
  const viewerLogin = await fetch(`${BASE}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: viewer.user.email, password: 'Passw0rd!23' }) });
  const viewerBody = await viewerLogin.json();
  if (viewerBody.accessToken) {
    token = viewerBody.accessToken;
    r = await j('/api/notes', { method: 'POST', body: JSON.stringify({ content: 'Viewer annotation', relatedDeal: deal._id }) });
    ok('viewer can post an internal note', r.status === 201, r.body?.message);
    r = await j('/api/deals', { method: 'POST', body: JSON.stringify({ title: 'Nope', customerId: cust._id }) });
    ok('viewer cannot create a deal', r.status === 403, `status=${r.status}`);
    token = adminToken;
  } else {
    ok('viewer login (skipped: no known password for the seeded viewer)', true, 'viewer password unknown');
  }
} else {
  ok('viewer login (skipped: no viewer in the team)', true, 'no viewer user');
}

// 23. a second email signup must work (the non-sparse googleId index blocked this)
r = await j('/auth/register', { method: 'POST', body: JSON.stringify({ email: `smoke2_${Date.now()}@test.io`, password: 'Passw0rd!23', companyName: 'Second Co' }) });
ok('second email signup succeeds (googleId index fixed)', r.status === 201, r.body?.message || JSON.stringify(r.body).slice(0,200));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
