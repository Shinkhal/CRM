import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/', session: false }),
  async (req, res) => {
    try {
      const { id: googleId, displayName: name, emails, photos } = req.user;
      const email = emails[0].value;
      const image = photos[0]?.value;

      let user = await User.findOne({ googleId });
      if (!user) {
        user = new User({ googleId, email, name, image });
        await user.save();
      }

      // 🔐 Create short-lived access token
      const accessToken = jwt.sign(
        { id: user._id, email: user.email, name: user.name },
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
        sameSite: 'Strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // ✅ Redirect or respond with access token
      res.redirect(`${process.env.CLIENT_URL}/auth-success?accessToken=${accessToken}`);
    } catch (err) {
      console.error('OAuth error:', err);
      res.redirect(`${process.env.CLIENT_URL}/auth-failure`);
    }
  }
);

router.post('/refresh', async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.sendStatus(401);

  try {
    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(payload.id);

    if (!user) return res.sendStatus(403);

    const accessToken = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken });
  } catch (err) {
    return res.sendStatus(403);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  return res.status(200).json({ message: 'Logged out' });
});


export default router;
