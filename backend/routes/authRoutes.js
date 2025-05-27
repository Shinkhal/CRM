import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Adjust path as needed

const router = express.Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', {
  failureRedirect: '/',
  session: false
}), async (req, res) => {
  try {
    const { id: googleId, displayName: name, emails, photos } = req.user;
    const email = emails[0].value;
    const image = photos[0]?.value;

    // Check if user already exists
    let user = await User.findOne({ googleId });

    // Create new user if not exists
    if (!user) {
      user = new User({ googleId, email, name, image });
      await user.save();
    }

    // Create JWT token
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Redirect with token
    res.redirect(`${process.env.CLIENT_URL}/auth-success?token=${token}`);
  } catch (error) {
    console.error('Error during Google OAuth callback:', error);
    res.redirect(`${process.env.CLIENT_URL}/auth-failure`);
  }
});

export default router;
