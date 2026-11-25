import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

declare module 'express-session' {
  interface SessionData {
    oauthFlow?: { nonce: string; inviteToken?: string; expiresAt: number };
  }
}

export const beginOAuth: RequestHandler = (req, res, next) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    res.status(503).json({ message: 'Google sign-in is not configured' });
    return;
  }
  req.session.oauthFlow = {
    nonce: randomBytes(32).toString('hex'),
    inviteToken: typeof req.query.inviteToken === 'string' ? req.query.inviteToken : undefined,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  req.session.save(next);
};

export const validateOAuthState: RequestHandler = (req, res, next) => {
  const flow = req.session.oauthFlow;
  const state = req.query.state;
  const valid = flow && flow.expiresAt > Date.now() && typeof state === 'string'
    && Buffer.byteLength(state) === Buffer.byteLength(flow.nonce)
    && timingSafeEqual(Buffer.from(state), Buffer.from(flow.nonce));
  delete req.session.oauthFlow;
  req.session.save(error => {
    if (error) return next(error);
    if (!valid) {
      res.status(400).json({ message: 'Invalid or expired sign-in request. Please sign in again.' });
      return;
    }
    res.locals.inviteToken = flow.inviteToken;
    next();
  });
};
