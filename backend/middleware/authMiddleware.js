// middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token, unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user from DB in case role/business changed
    const user = await User.findById(decoded.id).populate('business');
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      businessId: user.business?._id,
    };

    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// middleware/auth.js
export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
};



