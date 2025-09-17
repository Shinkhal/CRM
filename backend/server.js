import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
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
import dashboardRoutes from './routes/dashboardRoutes.js';
import healthRoutes from './routes/health.js';
import businessRoutes from './routes/businessRoutes.js';

import {RedisStore} from "connect-redis"
import redisClient from './config/redis.js';

dotenv.config();
connectDB();

const app = express();


const redisStore = new RedisStore({
  client: redisClient,
  prefix: "CRM:",
})

// app.use(cors({
//   origin: 'https://crm-gamma-inky.vercel.app',
//   credentials: true,
// }));

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    store: redisStore,
    secret: process.env.JWT_SECRET ,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, 
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());


app.use('/health', healthRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/ai', aiRoutes);
app.use('/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/business', businessRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
