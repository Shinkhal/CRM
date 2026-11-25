import { joinWithInvitation } from '../services/invitations.js';
import { rotateRefreshToken, revokeRefreshToken } from '../services/refreshSessions.js';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Business, { DEFAULT_MODULES } from '../models/business.js';
import { env } from '../config/env.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../utils/authSecurity.js';
import { UserRole } from '../types/index.js';
import { assertEmail, assertString } from '../utils/validation.js';

// ----------------------------------------------------
// 1. Register a new Company & Admin Account
// ----------------------------------------------------
export const register = asyncHandler(async (req: Request, res: Response) => {
  const {
    adminName,
    email,
    password,
    companyName,
    industry = 'General',
    currency = 'INR',
  } = req.body;

  if (!email || !password || !companyName) {
    throw new AppError('Email, password, and company name are required', 400);
  }

  /**
   * The types are checked as well as the presence. `companyName.trim()`
   * threw a TypeError when a number was sent, which surfaced as a 500.
   */
  const normalizedEmail = assertEmail(email);
  assertString(adminName, 'adminName', { optional: true, max: 120 });
  assertString(companyName, 'companyName', { min: 1, max: 160 });
  assertString(industry, 'industry', { optional: true, max: 120 });
  assertString(currency, 'currency', { optional: true, max: 8 });

  if (typeof password !== 'string' || password.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }
  if (password.length > 200) {
    throw new AppError('Password must be at most 200 characters long', 400);
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  const hashedPassword = await hashPassword(password);

  // 1. Create Business Tenant
  const business = new Business({
    name: companyName.trim(),
    industry: (industry || 'General').trim(),
    enabledModules: DEFAULT_MODULES,
    settings: {
      currency: (currency || 'INR').trim(),
      // The pipeline stages are data now: they live on the Pipeline
      // collection and are seeded on demand, so this hardcoded list was
      // misleading and is no longer read by anything.
      customFields: [],
    },
  });

  // 2. Create Root Admin User
  const user = new User({
    name: adminName ? adminName.trim() : companyName.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: 'admin',
    status: 'active',
    isEmailVerified: true,
    business: business._id,
    lastLoginAt: new Date(),
  });

  // 3. Link Owner
  business.owner = user._id;
  business.users = [user._id];

  await Promise.all([business.save(), user.save()]);

  logger.info('New company and admin registered', {
    businessId: business._id,
    userId: user._id,
    service: 'authController',
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user._id);
  setRefreshTokenCookie(res, refreshToken);

  res.status(201).json({
    message: 'Company registered successfully',
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      businessId: business._id,
    },
    business: {
      id: business._id,
      name: business.name,
      industry: business.industry,
      enabledModules: business.enabledModules,
      settings: business.settings,
    },
  });
});

// ----------------------------------------------------
// 2. Standard Login (Email & Password)
// ----------------------------------------------------
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }
  if (typeof password !== 'string') {
    throw new AppError('Password must be a string', 400);
  }

  const normalizedEmail = assertEmail(email);

  const user = await User.findOne({ email: normalizedEmail })
    .select('+password')
    .populate('business');

  if (!user || !user.password) {
    throw new AppError('Invalid email or password', 401);
  }

  const isPasswordValid = await verifyPassword(user.password, password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check employee status
  if (user.status === 'suspended') {
    throw new AppError(
      'Your account has been temporarily suspended. Please contact your company administrator.',
      403
    );
  }

  if (user.status === 'deactivated') {
    throw new AppError(
      'Your account has been deactivated. Please contact your company administrator.',
      403
    );
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user._id);
  setRefreshTokenCookie(res, refreshToken);

  logger.info('User logged in successfully', {
    userId: user._id,
    email: user.email,
    service: 'authController',
  });

  const businessObj = user.business as any;

  res.json({
    message: 'Login successful',
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      businessId: businessObj?._id,
    },
    business: businessObj
      ? {
          id: businessObj._id,
          name: businessObj.name,
          industry: businessObj.industry,
          enabledModules: businessObj.enabledModules,
          settings: businessObj.settings,
        }
      : null,
  });
});

// ----------------------------------------------------
// 3. Complete Invite & Set Password
// ----------------------------------------------------
export const acceptInvite = asyncHandler(async (req: Request, res: Response) => {
  const { token, name, password } = req.body;

  if (!token || !password) {
    throw new AppError('Invite token and password are required', 400);
  }

  if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }

  let decoded: { email: string; businessId: string; role: UserRole };
  try {
    decoded = jwt.verify(token, env.JWT_SECRET) as any;
  } catch {
    throw new AppError('Invitation link is invalid or has expired', 400);
  }

  assertString(name, 'name', { optional: true, max: 120 });
  const { email: inviteEmail, businessId, role } = decoded;
  if (typeof inviteEmail !== 'string' || !['admin', 'manager', 'viewer'].includes(role)) throw new AppError('Invalid invitation', 400);
  const normalizedInviteEmail = inviteEmail.trim().toLowerCase();

  const business = await Business.findById(businessId);
  if (!business) {
    throw new AppError('The organization that sent this invite no longer exists', 404);
  }

  /**
   * The pending invite has to still exist. The token is a seven day JWT, so
   * without this check an invitation that had been withdrawn would still be
   * redeemable for the rest of its life.
   */
  const pendingInvite = business.pendingInvites.find(
    (inv: any) => String(inv.email || '').trim().toLowerCase() === normalizedInviteEmail && inv.token === token
  );
  if (!pendingInvite) {
    throw new AppError('This invitation has already been used or withdrawn', 400);
  }

  /**
   * An account that already exists must not be taken over.
   *
   * The previous implementation found the user by email, overwrote their
   * password with the one supplied in this request, and moved them into the
   * inviting tenant. Any admin could invite an address they controlled the
   * inbox for, reset that person's password and take over the account.
   *
   * An existing member has to prove who they are first, which is what the
   * authenticated `/api/business/accept-invite` route is for.
   */
  const existingUser = await User.findOne({ email: normalizedInviteEmail }).select('_id');
  if (existingUser) {
    throw new AppError(
      'An account with this email already exists. Sign in first, then accept the invitation from your profile.',
      409
    );
  }

  const hashedPassword = await hashPassword(password);

  const user = new User({
    email: normalizedInviteEmail,
    name: name?.trim() || normalizedInviteEmail.split('@')[0],
    password: hashedPassword,
    role,
    status: 'active',
    isEmailVerified: true,
    business: business._id,
    lastLoginAt: new Date(),
  });

  await joinWithInvitation(user, token);

  logger.info('User joined organization via invite', {
    userId: user._id,
    businessId: business._id,
    role,
    service: 'authController',
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user._id);
  setRefreshTokenCookie(res, refreshToken);

  res.json({
    message: 'Welcome to the team!',
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      businessId: business._id,
    },
    business: {
      id: business._id,
      name: business.name,
      industry: business.industry,
      enabledModules: business.enabledModules,
      settings: business.settings,
    },
  });
});

// ----------------------------------------------------
// 4. Get Current User & Organization Context
// ----------------------------------------------------
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  const user = await User.findById(userId).populate('business');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.status !== 'active') {
    throw new AppError(`Your account is ${user.status}`, 403);
  }

  const business = user.business as any;

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      businessId: business?._id,
    },
    business: business
      ? {
          id: business._id,
          name: business.name,
          industry: business.industry,
          enabledModules: business.enabledModules || DEFAULT_MODULES,
          settings: business.settings,
        }
      : null,
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new AppError('Name is required', 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.name = name.trim();
  await user.save();

  logger.info('User profile updated', { userId: user._id, name: user.name });

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    },
  });
});

// ----------------------------------------------------
// 5. Silent Refresh Token Exchange
// ----------------------------------------------------
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    throw new AppError('Missing refresh token', 401);
  }

  try {
    const rotated = await rotateRefreshToken(token);
    const user = await User.findById(rotated.userId).populate('business');
    if (!user || user.status !== 'active') {
      await revokeRefreshToken(rotated.token);
      throw new AppError('User session is no longer active', 403);
    }
    setRefreshTokenCookie(res, rotated.token);
    res.json({ accessToken: generateAccessToken(user) });
  } catch {
    clearRefreshTokenCookie(res);
    throw new AppError('Invalid or expired refresh token', 403);
  }
});

// ----------------------------------------------------
// 6. Logout
// ----------------------------------------------------
export const logout = asyncHandler(async (req: Request, res: Response) => {
  await revokeRefreshToken(req.cookies.refreshToken);
  clearRefreshTokenCookie(res);
  res.status(200).json({ message: 'Logged out successfully' });
});

// ----------------------------------------------------
// 7. Demo 1-Click Login (Development / Sandbox)
// ----------------------------------------------------
export const demoLogin = asyncHandler(async (req: Request, res: Response) => {
  // The demo shortcut grants admin access without a password. It must never
  // be reachable in production, where it would be an unauthenticated
  // backdoor into a real tenant.
  if (env.NODE_ENV === 'production' && !env.ALLOW_DEMO_LOGIN) {
    throw new AppError('Demo login is disabled in this environment', 403);
  }

  const role: UserRole = req.body.role === 'manager' || req.body.role === 'viewer' ? req.body.role : 'admin';

  /**
   * The demo workspace is shared by the three demo roles, so an admin, a
   * manager and a viewer all see the same records.
   */
  const DEMO_BUSINESS_NAME = 'Acme Global Demo';
  const demoEmail = `demo.${role}@acmeglobal.com`;

  let business = await Business.findOne({ name: DEMO_BUSINESS_NAME });
  let user = await User.findOne({ email: demoEmail });

  if (!user) {
    user = new User({
      name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      email: demoEmail,
      role,
      status: 'active',
      isEmailVerified: true,
      lastLoginAt: new Date(),
    });
    await user.save();
  }

  if (!business) {
    business = new Business({
      name: DEMO_BUSINESS_NAME,
      industry: 'Technology',
      owner: user._id,
      users: [user._id],
      enabledModules: DEFAULT_MODULES,
      settings: {
        currency: 'INR',
        // The pipeline stages are data now: they live on the Pipeline
        // collection and are seeded on demand.
        customFields: [],
      },
    });

    user.business = business._id;
    await Promise.all([business.save(), user.save()]);
  } else {
    let shouldSaveBusiness = false;
    if (!business.owner) {
      business.owner = user._id;
      shouldSaveBusiness = true;
    }
    if (!business.users.some((u) => String(u) === String(user._id))) {
      business.users.push(user._id);
      shouldSaveBusiness = true;
    }
    if (shouldSaveBusiness) {
      await business.save();
    }
  }

  const accessToken = generateAccessToken(user);
  const refreshTokenVal = await generateRefreshToken(user._id);
  setRefreshTokenCookie(res, refreshTokenVal);

  res.json({
    message: `Logged in as Demo ${role}`,
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      businessId: business._id,
    },
    business: {
      id: business._id,
      name: business.name,
      industry: business.industry,
      enabledModules: business.enabledModules,
      settings: business.settings,
    },
  });
});

export default {
  register,
  login,
  acceptInvite,
  getMe,
  updateProfile,
  refreshToken,
  logout,
  demoLogin,
};
