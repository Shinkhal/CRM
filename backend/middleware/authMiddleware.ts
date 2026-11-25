import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errorHandler.js';
import { UserRole } from '../types/index.js';

interface JwtPayload {
  id: string;
  email?: string;
  role?: UserRole;
  businessId?: string;
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

  if (!token) {
    return next(new AppError('No token, unauthorized', 401));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Fetch fresh user from DB in case role/status/business changed
    const user = await User.findById(decoded.id).populate<{ business: { _id: any } }>('business');
    if (!user) {
      return next(new AppError('User not found', 401));
    }

    if (user.status !== 'active') {
      return next(
        new AppError(
          `Your account has been ${user.status}. Please contact your company administrator.`,
          403
        )
      );
    }

    req.user = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.business?._id ? String(user.business._id) : '',
    };

    next();
  } catch {
    return next(new AppError('Invalid token', 401));
  }
};

export const authorize = (roles: UserRole[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Forbidden: insufficient role', 403));
    }
    next();
  };
};

export default { protect, authorize };
