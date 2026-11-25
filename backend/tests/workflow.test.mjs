/**
 * End-to-end test for the workflow automation engine.
 *
 * Run against a live server:
 *   node tests/workflow.test.mjs
 */

const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000';

let token = null;
let passed = 0;
let failed = 0;

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
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
};

const ok = (label, condition, extra = '') => {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${label}${extra ? ' :: ' + extra : ''}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${label}${extra ? ' :: ' + extra : ''}`);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const run = async () => {
  // ---------------------------------------------------------------- setup
  const email = `wf_${Date.now()}@test.io`;
  let r = await j('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: 'Passw0rd!23',
      companyName: 'Workflow Test Co',
    }),
  });
  ok('register', r.status === 201, r.body?.message);
  token = r.body?.accessToken;

  r = await j('/api/customers', {
    method: 'POST',
    body: JSON.stringify({ name: 'WF Contact', email: `wf_contact_${Date.now()}@test.io` }),
  });
  const customer = r.body?.customer;
  ok('create contact', r.status === 201);

  // ------------------------------------------------------- starter workflows
  r = await j('/api/workflows');
  const starters = r.body?.workflows || [];
  ok('starter workflows are created', starters.length >= 5, `count=${starters.length}`);
  ok('starter workflows are disabled by default', starters.every((w) => w.enabled === false));

  r = await j('/api/workflows/catalogue');
  ok('action catalogue is available', (r.body?.actions || []).length >= 8, `actions=${r.body?.actions?.length}`);
  ok('event catalogue is available', (r.body?.events || []).length >= 10, `events=${r.body?.events?.length}`);

  // ------------------------------------------------- expression validation
  r = await j('/api/workflows/validate', {
    method: 'POST',
    body: JSON.stringify({ expression: 'doc.value > 1000 && doc.stage == "won"' }),
  });
  ok('valid expression accepted', r.body?.valid === true, r.body?.error);

  r = await j('/api/workflows/validate', {
    method: 'POST',
    body: JSON.stringify({ expression: 'doc.' }),
  });
  ok('invalid expression rejected', r.body?.valid === false, r.body?.error);

  // ------------------------------------------------- definition validation
  r = await j('/api/workflows', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Bad event',
      trigger: { event: 'not.an.event' },
      actions: [{ actionType: 'create_task', params: { title: 'x' } }],
    }),
  });
  ok('unknown event rejected', r.status === 400, r.body?.message);

  r = await j('/api/workflows', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Bad action',
      trigger: { event: 'deal.created' },
      actions: [{ actionType: 'do_a_barrel_roll', params: {} }],
    }),
  });
  ok('unknown action rejected', r.status === 400, r.body?.message);

  r = await j('/api/workflows', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Bad condition',
      trigger: { event: 'deal.created' },
      conditions: 'doc.value >',
      actions: [{ actionType: 'create_task', params: { title: 'x' } }],
    }),
  });
  ok('invalid condition rejected on save', r.status === 400, r.body?.message);

  // --------------------------------------------- a working stage workflow
  r = await j('/api/workflows', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Task on negotiation',
      description: 'Creates a task when a deal reaches negotiation',
      trigger: { event: 'deal.stage_changed' },
      conditions: "doc.stage == 'negotiation'",
      actions: [
        {
          actionType: 'create_task',
          params: {
            title: 'Negotiate {{doc.title}}',
            dueIn: '2 days',
            priority: 'high',
            assignTo: 'owner',
          },
        },
      ],
    }),
  });
  ok('create workflow', r.status === 201, r.body?.message);
  const workflowId = r.body?.workflow?._id;

  // The condition must not fire for a different stage.
  r = await j('/api/deals', {
    method: 'POST',
    body: JSON.stringify({ title: 'WF Deal', customerId: customer._id, value: 1000, stage: 'lead' }),
  });
  const deal = r.body?.deal;
  ok('create deal', r.status === 201);

  await sleep(1200);
  r = await j(`/api/tasks?dealId=${deal._id}`);
  ok('no task while the condition is unmet', (r.body?.tasks || []).length === 0, `tasks=${r.body?.tasks?.length}`);

  r = await j(`/api/deals/${deal._id}`, { method: 'PUT', body: JSON.stringify({ stage: 'negotiation' }) });
  ok('move the deal to negotiation', r.status === 200, r.body?.message);

  await sleep(1500);
  r = await j(`/api/tasks?dealId=${deal._id}`);
  const tasks = r.body?.tasks || [];
  const created = tasks.find((task) => task.title === 'Negotiate WF Deal');
  ok('the workflow created the task', !!created, `tasks=${tasks.map((t) => t.title).join(' | ')}`);
  ok('the task is linked to the deal', created?.relatedDeal?.title === 'WF Deal' || created?.relatedDeal === deal._id);
  ok('the task has a due date', !!created?.dueDate, created?.dueDate);

  // ------------------------------------------------------------ run records
  r = await j('/api/workflows/runs');
  const runs = r.body?.runs || [];
  ok('the run was recorded', runs.length >= 1, `runs=${runs.length}`);
  const runRecord = runs.find((entry) => String(entry.workflowId) === String(workflowId));
  ok('the run belongs to the workflow', !!runRecord, runRecord?.workflowName);
  ok('the run completed', runRecord?.status === 'completed', runRecord?.status);
  ok('the run recorded the step', runRecord?.steps?.[0]?.status === 'completed', JSON.stringify(runRecord?.steps?.[0]?.status));

  // ------------------------------------------------------- trigger filters
  r = await j('/api/workflows', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Only big deals',
      trigger: { event: 'deal.created', filters: [{ field: 'value', operator: 'greater_than', value: 100000 }] },
      actions: [{ actionType: 'add_note', params: { content: 'A big deal landed' } }],
    }),
  });
  ok('create a filtered workflow', r.status === 201);
  const filteredId = r.body?.workflow?._id;

  r = await j('/api/deals', {
    method: 'POST',
    body: JSON.stringify({ title: 'Small Deal', customerId: customer._id, value: 100 }),
  });
  await sleep(1200);
  r = await j('/api/workflows/runs?workflowId=' + filteredId);
  ok('the filter excluded the small deal', (r.body?.runs || []).length === 0, `runs=${r.body?.runs?.length}`);

  r = await j('/api/deals', {
    method: 'POST',
    body: JSON.stringify({ title: 'Big Deal', customerId: customer._id, value: 250000 }),
  });
  await sleep(1200);
  r = await j('/api/workflows/runs?workflowId=' + filteredId);
  ok('the filter admitted the big deal', (r.body?.runs || []).length === 1, `runs=${r.body?.runs?.length}`);

  // ---------------------------------------------------------- wait action
  r = await j('/api/workflows', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Delayed sequence',
      trigger: { event: 'customer.created' },
      actions: [
        { actionType: 'add_note', params: { content: 'First' } },
        { actionType: 'wait', params: { duration: '3 days' } },
        { actionType: 'add_note', params: { content: 'Second' } },
      ],
    }),
  });
  const waitingId = r.body?.workflow?._id;
  ok('create a workflow with a wait', r.status === 201);

  r = await j('/api/customers', {
    method: 'POST',
    body: JSON.stringify({ name: 'Waiting Contact', email: `wf_wait_${Date.now()}@test.io` }),
  });
  const waitingCustomer = r.body?.customer;
  await sleep(1500);

  r = await j(`/api/workflows/runs?workflowId=${waitingId}`);
  const waitingRun = (r.body?.runs || []).find((entry) => String(entry.workflowId) === String(waitingId));
  ok('the run parked on the wait', waitingRun?.status === 'waiting', waitingRun?.status);
  ok('the resume time was stored', !!waitingRun?.nextRunAt, waitingRun?.nextRunAt);
  ok('the first step ran', waitingRun?.steps?.[0]?.status === 'completed');
  ok(
    'the wait is recorded and the step after it is pending',
    (waitingRun?.steps || []).length === 2 && waitingRun?.steps?.[1]?.actionType === 'wait',
    `steps=${(waitingRun?.steps || []).map((s) => s.actionType).join(',')}`
  );

  // ------------------------------------------------------- failing action
  r = await j('/api/workflows', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Broken workflow',
      trigger: { event: 'note.created' },
      actions: [{ actionType: 'create_task', params: { title: '' } }],
    }),
  });
  const brokenId = r.body?.workflow?._id;

  r = await j('/api/notes', {
    method: 'POST',
    body: JSON.stringify({ content: 'Trigger the broken workflow', relatedCustomer: customer._id }),
  });
  ok('create a note', r.status === 201);
  await sleep(1500);

  r = await j(`/api/workflows/runs?workflowId=${brokenId}`);
  const brokenRun = (r.body?.runs || [])[0];
  ok('the failing run is marked failed', brokenRun?.status === 'failed', brokenRun?.status);
  ok('the failure is recorded on the step', brokenRun?.steps?.[0]?.status === 'failed', brokenRun?.steps?.[0]?.error);

  // ------------------------------------------------------------ run now
  r = await j(`/api/workflows/${workflowId}/run`, {
    method: 'POST',
    body: JSON.stringify({ entity: 'deal', entityId: deal._id }),
  });
  ok('run a workflow on demand', r.status === 200, r.body?.message);
  ok('the manual run completed', r.body?.run?.status === 'completed', r.body?.run?.status);

  // -------------------------------------------------------- notifications
  r = await j('/api/workflows', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Notify on won',
      trigger: { event: 'deal.won' },
      actions: [
        {
          actionType: 'send_notification',
          params: { recipients: 'team', title: 'Deal won: {{doc.title}}', message: 'Nice work' },
        },
      ],
    }),
  });
  const notifyId = r.body?.workflow?._id;
  ok('create a notification workflow', r.status === 201);

  await j(`/api/deals/${deal._id}`, { method: 'PUT', body: JSON.stringify({ stage: 'won' }) });
  await sleep(1500);

  r = await j('/api/notifications');
  const notifications = r.body?.notifications || [];
  ok('the notification was created', notifications.length >= 1, `notifications=${notifications.length}`);
  ok('the notification title was interpolated', notifications.some((n) => n.title === 'Deal won: WF Deal'), notifications.map((n) => n.title).join(' | '));
  ok('the unread count is reported', (r.body?.unreadCount || 0) >= 1, `unread=${r.body?.unreadCount}`);

  const notificationId = notifications[0]?._id;
  r = await j(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
  ok('mark a notification as read', r.status === 200 && r.body?.notification?.read === true);

  // ------------------------------------------------------------- toggling
  r = await j(`/api/workflows/${workflowId}/toggle`, { method: 'POST', body: JSON.stringify({ enabled: false }) });
  ok('disable a workflow', r.status === 200 && r.body?.workflow?.enabled === false);

  const beforeCount = (await j('/api/workflows/runs?workflowId=' + workflowId)).body?.runs?.length || 0;
  await j(`/api/deals/${deal._id}`, { method: 'PUT', body: JSON.stringify({ stage: 'proposal' }) });
  await sleep(1200);
  r = await j('/api/workflows/runs?workflowId=' + workflowId);
  const afterCount = (r.body?.runs || []).length || 0;
  ok('a disabled workflow does not run', afterCount === beforeCount, `runs ${beforeCount} -> ${afterCount}`);

  // ------------------------------------------------- overdue task sweep
  r = await j('/api/workflows', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Overdue chase',
      trigger: { event: 'task.overdue' },
      actions: [{ actionType: 'add_note', params: { content: 'The task is overdue' } }],
    }),
  });
  const overdueId = r.body?.workflow?._id;
  ok('create an overdue workflow', r.status === 201);

  r = await j('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      title: 'An overdue task',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  });
  ok('create an already overdue task', r.status === 201);

  r = await j('/api/workflows/sweep/overdue', { method: 'POST' });
  ok('the sweep ran', r.status === 200, `raised=${r.body?.raised}`);
  await sleep(1500);

  r = await j(`/api/workflows/runs?workflowId=${overdueId}`);
  const overdueRun = (r.body?.runs || [])[0];
  ok('the overdue event fired', !!overdueRun, `runs=${(r.body?.runs || []).length}`);
  ok('the overdue run completed', overdueRun?.status === 'completed', overdueRun?.status);

  // -------------------------------------------------------------- cleanup
  r = await j(`/api/workflows/${brokenId}`, { method: 'DELETE' });
  ok('delete a workflow', r.status === 200, r.body?.message);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

run().catch((error) => {
  console.error('Test run crashed:', error);
  process.exit(1);
});
