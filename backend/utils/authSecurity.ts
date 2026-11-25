import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { env } from '../config/env.js';

export const hashPassword = async (password: string): Promise<string> => {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
};

export const verifyPassword = async (hash: string, plain: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
};

export const generateAccessToken = (user: {
  _id: any;
  email: string;
  name?: string;
  role: string;
  business?: any;
}): string => {
  const businessId = user.business?._id || user.business;
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId,
    },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

export { issueRefreshToken as generateRefreshToken } from '../services/refreshSessions.js';

export const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
};
