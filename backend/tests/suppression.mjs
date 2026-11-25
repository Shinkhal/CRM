import assert from 'node:assert/strict';
const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000';
let token = ''; 
const request = async (path, body) => {
  const res = await fetch(BASE + path, { method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, body: await res.json() };
};
let result = await request('/auth/register', { email: `sup_${Date.now()}@test.io`, password: 'Passw0rd!23', companyName: 'Suppression Test' });
assert.equal(result.status, 201); token = result.body.accessToken;
result = await request('/api/customers', { name: 'Subscriber', email: 'subscriber@example.test' });
assert.equal(result.status, 201);
result = await request('/api/logs/suppression', { email: 'subscriber@example.test', reason: 'bounce' });
assert.equal(result.status, 201);
result = await request('/api/campaigns', { name: 'Suppression', message: 'Hi', segmentRules: { email: { eq: 'subscriber@example.test' } } });
assert.equal(result.status, 201); const campaignId = result.body.campaign._id;
result = await request('/api/logs/simulate', { campaignId }); assert.equal(result.status, 202);
let logs = [];
for (let attempt = 0; attempt < 30; attempt++) {
  result = await request(`/api/logs/${campaignId}`); logs = result.body.logs;
  if (logs.length) break;
  await new Promise(resolve => setTimeout(resolve, 200));
}
assert.equal(logs.length, 1); assert.equal(logs[0].status, 'SKIPPED');
result = await request('/api/logs/simulate', { campaignId }); assert.equal(result.status, 202);
result = await request(`/api/logs/${campaignId}`); assert.equal(result.body.logs.length, 1);
result = await request('/api/logs/suppression'); assert.equal(result.body.entries.length, 1);
console.log('PASS queued delivery skips suppressed recipient and repeated send does not duplicate logs');
