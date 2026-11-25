export type UserRole = 'admin' | 'manager' | 'viewer';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  /** Empty string when the user is not attached to a tenant yet. */
  businessId: string;
  name?: string;
}

declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
