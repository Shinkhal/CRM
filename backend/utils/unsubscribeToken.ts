import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env.js';

/**
 * Unsubscribe links are stateless: the token is an HMAC over the tenant id
 * and the recipient address, so no server side record has to exist before a
 * campaign is sent. Verification is constant time.
 */
const sign = (payload: string): string =>
  createHmac('sha256', env.JWT_SECRET).update(payload).digest('base64url');

export const buildUnsubscribeToken = (businessId: string, email: string): string =>
  sign(`${businessId}:${email.trim().toLowerCase()}`);

export const verifyUnsubscribeToken = (businessId: string, email: string, token: string): boolean => {
  if (!token) return false;
  const expected = Buffer.from(buildUnsubscribeToken(businessId, email));
  const provided = Buffer.from(token);
  if (expected.length !== provided.length) return false;
  try {
    return timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
};
