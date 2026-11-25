import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { once } from 'node:events';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
// Fixed isolated endpoints; never use the project's database or email credentials.
Object.assign(process.env, {
  NODE_ENV: 'test', MONGODB_URI: 'mongodb://127.0.0.1:27028/?directConnection=true',
  MONGODB_DB_NAME: `crm_regression_${process.pid}`, JWT_SECRET: 'a'.repeat(40),
  REFRESH_TOKEN_SECRET: 'b'.repeat(40), SESSION_SECRET: 'c'.repeat(40),
  CLIENT_URL: 'https://app.test', SERVER_URL: 'https://api.test', ALLOWED_ORIGINS: 'https://app.test',
  GOOGLE_CLIENT_ID: 'test', GOOGLE_CLIENT_SECRET: 'test', ALLOW_DEMO_LOGIN: 'false',
  UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', REDIS_URL: '', REDIS_TCP_URL: '',
  GOOGLE_GEMINI_API_KEY: '', SMTP_HOST: '127.0.0.1', SMTP_USER: '', SMTP_PASS: '',
  SMTP_FROM: 'test@example.test', SMTP_SECURE: 'false',
});
const messages: string[] = [];
const smtp = createServer(socket => {
  socket.write('220 test SMTP\r\n');
  let buffer = ''; let data = false; let message = '';
  socket.on('data', chunk => {
    buffer += chunk.toString();
    while (buffer.includes('\r\n')) {
      const end = buffer.indexOf('\r\n'); const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
      if (data) {
        if (line === '.') { messages.push(message); message = ''; data = false; socket.write('250 accepted\r\n'); }
        else message += line + '\n';
      } else if (/^EHLO|^HELO/.test(line)) socket.write('250 localhost\r\n');
      else if (line === 'DATA') { data = true; socket.write('354 send data\r\n'); }
      else if (line === 'QUIT') socket.end('221 bye\r\n');
      else socket.write('250 OK\r\n');
    }
  });
});
smtp.listen(0, '127.0.0.1'); await once(smtp, 'listening');
process.env.SMTP_PORT = String((smtp.address() as { port: number }).port);
const cache = new Map<string, string>();
const redisStub = createHttpServer(async (req, res) => {
  let body = ''; for await (const chunk of req) body += chunk;
  const execute = (command: string[]) => {
    const [name, key, value] = command;
    switch (name.toUpperCase()) {
      case 'GET': return cache.get(key) ?? null;
      case 'SET': cache.set(key, value); return 'OK';
      case 'DEL': return Number(cache.delete(key));
      case 'PING': return 'PONG';
      default: return 1;
    }
  };
  const commands = JSON.parse(body);
  const result = Array.isArray(commands[0]) ? commands.map((cmd: string[]) => ({ result: execute(cmd) })) : { result: execute(commands) };
  res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(result));
});
redisStub.listen(0, '127.0.0.1'); await once(redisStub, 'listening');
process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${(redisStub.address() as { port: number }).port}`;
process.env.UPSTASH_REDIS_REST_TOKEN = 'isolated-test';
const { default: mongoose } = await import('mongoose');
const { default: express } = await import('express');
const { default: session } = await import('express-session');
const { default: cookieParser } = await import('cookie-parser');
const { default: passport } = await import('passport');
const { default: jwt } = await import('jsonwebtoken');
const { env } = await import('../config/env.js');
const { default: authRoutes } = await import('../routes/authRoutes.js');
const { default: campaignRoutes } = await import('../routes/campaignRoutes.js');
const { default: logRoutes } = await import('../routes/logRoutes.js');
const { errorHandler } = await import('../utils/errorHandler.js');
const { CampaignDelivery } = await import('../models/CampaignDelivery.js');
const { Campaign } = await import('../models/Campaign.js');
const { Customer } = await import('../models/Customer.js');
const { Business } = await import('../models/business.js');
const { User } = await import('../models/User.js');
const { Suppression } = await import('../models/Suppression.js');
const { CommunicationLog } = await import('../models/CommunicationLog.js');
const { RefreshSession } = await import('../models/RefreshSession.js');
const { processCampaignJobs } = await import('../services/campaignWorker.js');
let googleEmail = 'oauth@example.test';
// Mock only Google's external response, retaining the real route and state middleware.
passport.use('google', {
  name: 'google',
  authenticate(req: any, options: any) {
    if (!req.query.code) this.redirect(`https://google.test/?state=${options.state}`);
    else this.success({ id: googleEmail, displayName: 'OAuth Test', emails: [{ value: googleEmail }] });
  },
} as any);
const app = express();
app.use(express.json()); app.use(cookieParser());
app.use(session({ secret: env.SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize()); app.use('/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes); app.use('/api/logs', logRoutes); app.use(errorHandler);
for (const [path, module] of [
  ['ai', 'ai'], ['customers', 'customer'], ['orders', 'order'], ['business', 'business'], ['deals', 'deal'],
  ['tasks', 'task'], ['organizations', 'organization'], ['notes', 'note'], ['pipelines', 'pipeline'],
  ['audit', 'audit'], ['email-templates', 'emailTemplate'], ['search', 'search'],
  ['workflows', 'workflow'], ['notifications', 'notification'],
]) {
  app.use(`/api/${path}`, (await import(`../routes/${module}Routes.js`)).default);
}
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
let token = '';
const request = async (path: string, body?: unknown, cookie?: string, method?: string) => {
  const res = await fetch(base + path, { method: method || (body ? 'POST' : 'GET'), redirect: 'manual',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await res.text();
  return { status: res.status, body: text.startsWith('{') || text.startsWith('[') ? JSON.parse(text) : text,
    cookie: res.headers.get('set-cookie')?.split(';')[0], location: res.headers.get('location') };
};
await test('production regressions against isolated MongoDB and SMTP', async t => {
  t.after(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    const { drainWorkflowWork } = await import('../services/workflowEngine.js');
    await drainWorkflowWork();
    await mongoose.disconnect(); server.closeAllConnections();
    redisStub.closeAllConnections();
    await new Promise<void>(resolve => redisStub.close(() => resolve()));
    await new Promise<void>(resolve => server.close(() => resolve()));
    await new Promise<void>(resolve => smtp.close(() => resolve()));
  });
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB_NAME, serverSelectionTimeoutMS: 5000 });
  await Promise.all([User.init(), Business.init(), Customer.init(), CampaignDelivery.init(), RefreshSession.init()]);
  const registration = await request('/auth/register', { email: 'admin@example.test', password: 'Passw0rd!23', companyName: 'Tests' });
  assert.equal(registration.status, 201); token = registration.body.accessToken;
  const businessId = registration.body.business.id; const userId = registration.body.user.id;
  await t.test('refresh rotates once; replay and logout are rejected', async () => {
    const first = await request('/auth/refresh', {}, registration.cookie);
    assert.equal(first.status, 200); assert.notEqual(first.cookie, registration.cookie);
    assert.equal((await request('/auth/refresh', {}, registration.cookie)).status, 403);
    const concurrent = await Promise.all([request('/auth/refresh', {}, first.cookie), request('/auth/refresh', {}, first.cookie)]);
    assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 403]);
    const next = concurrent.find(r => r.status === 200)!;
    assert.equal((await request('/auth/logout', {}, next.cookie)).status, 200);
    assert.equal((await request('/auth/refresh', {}, next.cookie)).status, 403);
  });
  await t.test('false demo flag blocks production login', async () => {
    assert.equal(env.ALLOW_DEMO_LOGIN, false); env.NODE_ENV = 'production';
    try { assert.equal((await request('/auth/demo-login', {})).status, 403); }
    finally { env.NODE_ENV = 'test'; }
  });
  const startOAuth = async (inviteToken?: string) => {
    const start = await request('/auth/google' + (inviteToken ? `?inviteToken=${inviteToken}` : ''));
    assert.equal(start.status, 302);
    return { cookie: start.cookie, state: new URL(start.location!).searchParams.get('state')! };
  };
  await t.test('OAuth checks and consumes state; redirect contains no token', async () => {
    assert.equal((await request('/auth/google/callback?code=test')).status, 400);
    const bad = await startOAuth();
    assert.equal((await request('/auth/google/callback?code=test&state=wrong', undefined, bad.cookie)).status, 400);
    const good = await startOAuth(); const callback = `/auth/google/callback?code=test&state=${good.state}`;
    const result = await request(callback, undefined, good.cookie);
    assert.equal(result.location, 'https://app.test/auth-success');
    assert.ok(result.cookie?.startsWith('refreshToken='));
    assert.equal((await request(callback, undefined, good.cookie)).status, 400);
  });
  await t.test('OAuth rejects a withdrawn signed invitation', async () => {
    googleEmail = 'revoked@example.test';
    const invite = jwt.sign({ email: googleEmail, businessId, role: 'admin' }, env.JWT_SECRET, { expiresIn: '1h' });
    const start = await startOAuth(invite);
    const result = await request(`/auth/google/callback?code=test&state=${start.state}`, undefined, start.cookie);
    assert.equal(result.location, 'https://app.test/login?error=invalid_invite');
    assert.equal(await User.exists({ email: googleEmail }), null);
  });
  await t.test('queue preserves content; concurrent workers do not duplicate; suppression checked before send', async () => {
    const customers = await Customer.create([
      { name: 'Alice', email: 'alice@example.test', business: businessId, createdBy: userId },
      { name: 'Bob', email: 'bob@example.test', business: businessId, createdBy: userId },
    ]);
    const created = await request('/api/campaigns', { name: 'Hello', message: 'Saved content for {{name}}', segmentRules: {} });
    assert.equal(created.status, 201); assert.equal(created.body.campaign.message, 'Saved content for {{name}}');
    const id = created.body.campaign._id;
    const results = await Promise.all(Array.from({ length: 4 }, () => request('/api/logs/simulate', { campaignId: id, baseMessage: 'WRONG' })));
    assert.ok(results.every(r => r.status === 202)); assert.equal(await CampaignDelivery.countDocuments({ _id: id }), 1);
    await Suppression.create({ email: customers[1].email, business: businessId, reason: 'unsubscribe', source: 'test' });
    assert.equal((await request(`/api/campaigns/${id}`, { message: 'modified' }, undefined, 'PUT')).status, 409);
    await Promise.all([processCampaignJobs(), processCampaignJobs()]); await processCampaignJobs();
    assert.equal(messages.length, 1); assert.match(messages[0], /Saved content for Alice/); assert.doesNotMatch(messages[0], /WRONG/);
    assert.equal(await CommunicationLog.countDocuments({ campaignId: id }), 2);
    assert.equal((await Campaign.findById(id))?.status, 'sent');
    await request('/api/logs/simulate', { campaignId: id }); await processCampaignJobs(); assert.equal(messages.length, 1);
    const stats = await request('/api/campaigns/stats'); assert.equal(stats.body[0].sent, 1); assert.equal(stats.body[0].skipped, 1);
  });
  await t.test('restart resumes pending jobs and flags ambiguous sends without retry', async () => {
    const created = await request('/api/campaigns', { name: 'Restart', message: 'Restart message', segmentRules: {} });
    const id = created.body.campaign._id; await request('/api/logs/simulate', { campaignId: id });
    await CampaignDelivery.updateOne({ _id: id }, { $set: { 'recipients.$[recipient].state': 'sending', 'recipients.$[recipient].startedAt': new Date(0) } }, { arrayFilters: [{ 'recipient.email': 'alice@example.test' }] });
    await processCampaignJobs(); assert.equal(messages.length, 1);
    assert.equal((await Campaign.findById(id))?.status, 'needs_review');
    assert.equal(await CommunicationLog.countDocuments({ campaignId: id, status: 'UNKNOWN' }), 1);
  });
  await t.test('valid OAuth invite is consumed atomically and stale password invite rejected', async () => {
    googleEmail = 'invited@example.test';
    const invite = jwt.sign({ email: googleEmail, businessId, role: 'manager' }, env.JWT_SECRET, { expiresIn: '1h' });
    await Business.updateOne({ _id: businessId }, { $push: { pendingInvites: { email: googleEmail, role: 'manager', token: invite } } });
    const start = await startOAuth(invite);
    const result = await request(`/auth/google/callback?code=test&state=${start.state}`, undefined, start.cookie);
    assert.equal(result.location, 'https://app.test/auth-success');
    assert.equal((await User.findOne({ email: googleEmail }))?.role, 'manager');
    assert.equal((await Business.findById(businessId))?.pendingInvites.length, 0);
    const stale = jwt.sign({ email: 'stale@example.test', businessId, role: 'admin' }, env.JWT_SECRET, { expiresIn: '1h' });
    const replacement = jwt.sign({ email: 'stale@example.test', businessId, role: 'viewer' }, env.JWT_SECRET, { expiresIn: '1h' });
    await Business.updateOne({ _id: businessId }, { $push: { pendingInvites: { email: 'stale@example.test', role: 'viewer', token: replacement } } });
    assert.equal((await request('/auth/accept-invite', { token: stale, password: 'Passw0rd!23' })).status, 400);
  });
  for (const suite of ['smoke.mjs', 'workflow.test.mjs', 'suppression.mjs']) {
    await t.test(`existing ${suite} against isolated services`, async () => {
      const { startCampaignWorker, stopCampaignWorker } = await import('../services/campaignWorker.js');
      startCampaignWorker();
      try {
        const result = await promisify(execFile)(process.execPath, [`tests/${suite}`],
          { env: { ...process.env, SMOKE_BASE_URL: base }, timeout: 60000 });
        console.log(result.stdout);
      } finally { await stopCampaignWorker(); }
    });
  }

});
