import { joinWithInvitation } from '../services/invitations.js';
import { beginOAuth, validateOAuthState } from '../middleware/oauthState.js';
import express, { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Business from '../models/business.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { UserRole } from '../types/index.js';
import {
  register,
  login,
  acceptInvite,
  getMe,
  updateProfile,
  refreshToken,
  logout,
  demoLogin,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  generateRefreshToken,
  setRefreshTokenCookie,
} from '../utils/authSecurity.js';

const router = express.Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

// ----------------------------------------------------
// Standard SaaS Authentication Routes
// ----------------------------------------------------
router.post('/register', register);
router.post('/login', login);
router.post('/accept-invite', acceptInvite);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.post('/demo-login', demoLogin);

// ----------------------------------------------------
// Google OAuth Routes (Kept for 1-Click Convenience)
// ----------------------------------------------------
router.get('/google', beginOAuth, (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: req.session.oauthFlow!.nonce,
  })(req, res, next);
});

router.get(
  '/google/callback',
  validateOAuthState,
  passport.authenticate('google', { failureRedirect: '/', session: false }),
  async (req: Request, res: Response) => {
    try {
      const oauthUser = req.user as any;
      const { id: googleId, displayName: name, emails, photos } = oauthUser;
      const email = emails?.[0]?.value?.toLowerCase();
      const image = photos?.[0]?.value;

      if (!email) {
        logger.error('No email returned from Google OAuth', { service: 'auth' });
        return res.redirect(`${env.CLIENT_URL}/login?error=no_email`);
      }

      const inviteToken = res.locals.inviteToken as string | undefined;

      let user: any = await User.findOne({ $or: [{ googleId }, { email }] }).populate('business');

      if (!user) {
        user = new User({ googleId, email, name, image, status: 'active', isEmailVerified: true });

        if (inviteToken) {
          try {
            const decoded = jwt.verify(inviteToken, env.JWT_SECRET) as {
              email: string;
              businessId: string;
              role: UserRole;
            };
            const { email: inviteEmail, businessId, role } = decoded;

            if (email !== inviteEmail.toLowerCase()) {
              logger.warn('Invite email mismatch in OAuth', { email, inviteEmail, service: 'auth' });
              return res.redirect(`${env.CLIENT_URL}/login?error=invite_mismatch`);
            }

            const business = await Business.findById(businessId);
            if (!business) {
              return res.redirect(`${env.CLIENT_URL}/login?error=business_not_found`);
            }

            const pending = business.pendingInvites.find(inv =>
              inv.token === inviteToken && inv.email.toLowerCase() === email && inv.role === role);
            if (!pending) {
              return res.redirect(`${env.CLIENT_URL}/login?error=invalid_invite`);
            }
            user.business = business._id;
            user.role = role;
            await joinWithInvitation(user, inviteToken);
          } catch (err: any) {
            logger.error('Invalid invite token during OAuth callback', { error: err.message, service: 'auth' });
            return res.redirect(`${env.CLIENT_URL}/login?error=invalid_invite`);
          }
        } else {
          // Normal signup via Google → create company
          const business = new Business({
            name: `${name || 'Workspace'}'s Business`,
            owner: user._id,
            users: [user._id],
          });
          await business.save();

          user.business = business._id;
          user.role = 'admin';
        }

        if (!inviteToken) await user.save();
        user = await User.findById(user._id).populate('business');
      } else {
        // Link googleId if existing user signed in with Google
        if (!user.googleId) {
          user.googleId = googleId;
        }
        if (image && !user.image) {
          user.image = image;
        }
        user.lastLoginAt = new Date();
        await user.save();
      }

      if (!user || user.status !== 'active') {
        return res.redirect(`${env.CLIENT_URL}/login?error=account_inactive`);
      }

      const refreshTokenVal = await generateRefreshToken(user._id);
      setRefreshTokenCookie(res, refreshTokenVal);

      res.setHeader('Cache-Control', 'no-store');
      res.redirect(`${env.CLIENT_URL}/auth-success`);
    } catch (err: any) {
      logger.error('OAuth callback error', { error: err.message, stack: err.stack, service: 'auth' });
      res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
    }
  }
);

export default router;
