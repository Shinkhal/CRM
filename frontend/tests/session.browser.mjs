import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', headless: true });
try {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const jwt = role => `e30.${Buffer.from(JSON.stringify({ id: 'test-user', name: role === 'admin' ? 'Admin User' : 'Viewer User', email: 'test@example.test', role, businessId: 'business', exp: 9999999999 })).toString('base64url')}.signature`;
  let refreshes = 0; let current = jwt('admin'); let failToken = null; let delayRefresh = false;
  await page.route('http://127.0.0.1:5999/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5178', 'Access-Control-Allow-Credentials': 'true' } });
    if (route.request().method() === 'OPTIONS') return json({});
    if (path === '/health/live') return json({ status: 'ok' });
    if (path === '/auth/refresh') { refreshes++; if (delayRefresh) await new Promise(r => setTimeout(r, 200)); return json({ accessToken: current }); }
    if (path === '/auth/logout') return json({ message: 'Logged out' });
    if (path === '/api/probe') {
      if (!route.request().headers().authorization) return json({ message: 'Unauthenticated' }, 401);
      if (route.request().headers().authorization === `Bearer ${failToken}`) return json({ message: 'Expired' }, 401);
      return json({ ok: true });
    }
    if (path === '/api/business/modules') return json({ enabledModules: [], modules: [], settings: { currency: 'INR' } });
    if (path === '/api/notifications') return json({ notifications: [], unreadCount: 0 });
    if (path === '/auth/me') return json({ user: { name: 'Test User', role: 'admin' }, business: { name: 'Test' } });
    return json({});
  });
  await page.goto('http://127.0.0.1:5178/auth-success');
  await page.waitForURL('**/home');
  assert.equal(refreshes, 1, 'StrictMode boot shares one refresh');
  await page.getByText('Admin User').first().waitFor();
  console.log('PASS browser OAuth landing, silent refresh and authenticated navigation');
  failToken = current; current = jwt('viewer'); delayRefresh = true;
  const results = await page.evaluate(async () => {
    const { default: api, subscribeToToken } = await import(performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/api/axios.js').name);
    const tokens = []; const unsubscribe = subscribeToToken(t => tokens.push(t));
    await Promise.all([api.get('/probe'), api.get('/probe'), api.get('/probe')]); unsubscribe(); return tokens;
  });
  assert.equal(refreshes, 2, 'concurrent 401s share one refresh'); assert.equal(results.at(-1), current);
  await page.getByText('Viewer User').first().waitFor();
  console.log('PASS concurrent 401 refresh updates rendered React user context');
  await page.evaluate(async () => {
    const { endSession, refreshAccessToken } = await import(performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/api/axios.js').name);
    const pending = refreshAccessToken();
    await new Promise(resolve => setTimeout(resolve, 50));
    await endSession(); await pending;
  });
  await page.waitForURL('http://127.0.0.1:5178/');
  await page.getByRole('heading').first().waitFor();
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS logout clears React state and redirects; no browser exceptions');
  await page.screenshot({ path: '/tmp/crm-frontend-regression.png', fullPage: true });
} finally { await browser.close(); }
