import { createHash, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { RefreshSession } from '../models/RefreshSession.js';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const sign = (sid: string) => jwt.sign({ sid, jti: randomUUID() }, env.REFRESH_TOKEN_SECRET,
  { expiresIn: '7d', algorithm: 'HS256', audience: 'crm-refresh' });

const decode = (token: string): string => {
  const payload = jwt.verify(token, env.REFRESH_TOKEN_SECRET,
    { algorithms: ['HS256'], audience: 'crm-refresh' });
  if (typeof payload === 'string' || typeof payload.sid !== 'string') throw new Error('Invalid session');
  return payload.sid;
};

export const issueRefreshToken = async (userId: unknown): Promise<string> => {
  const sid = randomUUID();
  const token = sign(sid);
  await RefreshSession.create({ _id: sid, userId, tokenHash: hash(token),
    expiresAt: new Date(Date.now() + 7 * 86400000) });
  return token;
};

export const rotateRefreshToken = async (token: string) => {
  const sid = decode(token);
  const next = sign(sid);
  const session = await RefreshSession.findOneAndUpdate(
    { _id: sid, tokenHash: hash(token), expiresAt: { $gt: new Date() } },
    { $set: { tokenHash: hash(next) } },
    { new: true },
  );
  if (!session) throw new Error('Expired, revoked or already used session');
  return { token: next, userId: session.userId };
};

export const revokeRefreshToken = async (token: unknown): Promise<void> => {
  if (typeof token !== 'string') return;
  let sid: string;
  try { sid = decode(token); } catch { return; }
  // Any token in this session can revoke it, including one rotated by a concurrent request.
  await RefreshSession.deleteOne({ _id: sid });
};
