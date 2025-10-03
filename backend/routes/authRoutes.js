import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Business from '../models/business.js';

const router = express.Router();

router.get('/google', (req, res, next) => {
  // preserve inviteToken if present in query
  const inviteToken = req.query.inviteToken;
  const state = inviteToken ? Buffer.from(JSON.stringify({ inviteToken })).toString('base64') : undefined;

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state
  })(req, res, next);
});

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/', session: false }),
  async (req, res) => {
    try {
      const { id: googleId, displayName: name, emails, photos } = req.user;
      const email = emails[0].value;
      const image = photos[0]?.value;

      // Extract inviteToken if passed via state
      let inviteToken = null;
      if (req.query.state) {
        const decodedState = JSON.parse(
          Buffer.from(req.query.state, 'base64').toString()
        );
        inviteToken = decodedState.inviteToken;
      }

      let user = await User.findOne({ googleId }).populate('business');

      if (!user) {
        user = new User({ googleId, email, name, image });

        if (inviteToken) {
          // ✅ Case: User is joining via invite
          try {
            const decoded = jwt.verify(inviteToken, process.env.JWT_SECRET);
            const { email: inviteEmail, businessId, role } = decoded;

            if (email !== inviteEmail) {
              return res.redirect(`${process.env.CLIENT_URL}/auth-failure`);
            }

            const business = await Business.findById(businessId);
            if (!business) {
              return res.redirect(`${process.env.CLIENT_URL}/auth-failure`);
            }

            // attach user to invited business (just push ID now)
            business.users.push(user._id);
            business.pendingInvites = business.pendingInvites.filter(
              (inv) => inv.email !== email
            );
            await business.save();

            user.business = business._id;
            user.role = role; // role is now in User
          } catch (err) {
            console.error('Invalid invite token:', err);
            return res.redirect(`${process.env.CLIENT_URL}/auth-failure`);
          }
        } else {
          // ✅ Case: Normal signup → create new business
          const business = new Business({
            name: `${name}'s Business`,
            owner: user._id,
            users: [user._id], // add owner as first user
          });
          await business.save();

          user.business = business._id;
          user.role = 'admin'; // owner defaults to admin
        }

        await user.save();
        user = await User.findById(user._id).populate('business'); // repopulate
      }

      // 🔐 Create short-lived access token
      const accessToken = jwt.sign(
        {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role, // ✅ comes from User schema now
          businessId: user.business?._id,
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
      );

      // 🛡 Set refresh token in httpOnly, secure cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // ✅ Redirect with access token
      res.redirect(
        `${process.env.CLIENT_URL}/auth-success?accessToken=${accessToken}`
      );
    } catch (err) {
      console.error('OAuth error:', err);
      res.redirect(`${process.env.CLIENT_URL}/auth-failure`);
    }
  }
);


// Refresh token route
router.post('/refresh', async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.sendStatus(401);

  try {
    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(payload.id).populate('business');

    if (!user) return res.sendStatus(403);

    const accessToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.business?._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken });
  } catch (err) {
    console.error('Refresh token error:', err);
    return res.sendStatus(403);
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  return res.status(200).json({ message: 'Logged out' });
});

export default router;
