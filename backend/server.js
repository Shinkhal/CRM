import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import  connectDB  from './config/db.js';
import customerRoutes from './routes/customerRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import logRoutes from './routes/logRoutes.js';
import passport from 'passport';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import './config/passport.js';
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();
connectDB();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API is running...');
});
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/logs', logRoutes);
app.use(cookieParser());
app.use(session({ secret: process.env.JWT_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use('/api/ai', aiRoutes);
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});