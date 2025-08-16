import { Customer } from '../models/Customer.js';
import redisClient from '../config/redis.js';

export const createCustomer = async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    await redisClient.del(`customers:${req.user.id}`);

    res.status(201).json({ message: 'Customer created', customer });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const cacheKey = `customers:${req.user.id}`;
    const cachedCustomers = await redisClient.get(cacheKey);
    if (cachedCustomers) {
      console.log("Returning customers from Redis cache");
      return res.json(JSON.parse(cachedCustomers));
    }
    const customers = await Customer.find({ userId: req.user.id });
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(customers));

    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
