import { Order } from '../models/Order.js';
import { Customer } from '../models/Customer.js';
import redisClient from '../config/redis.js';

export const createOrder = async (req, res) => {
  try {
    const { customerId, amount, userId } = req.body;
    const order = new Order({ customerId, amount, userId });
    await order.save();

    const customer = await Customer.findById(customerId);
    if (customer) {
      const numericAmount = Number(amount);
      customer.totalSpend += numericAmount;
      customer.totalOrders += 1;
      customer.lastOrderDate = new Date();
      await customer.save();
    }

    // ❌ Invalidate Redis cache for this user’s orders
    await redisClient.del(`orders:${userId}`);

    res.status(201).json({ message: 'Order created', order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ 1. Check if cached orders exist
    const cachedOrders = await redisClient.get(`orders:${userId}`);
    if (cachedOrders) {
      console.log("📌 Orders fetched from Redis Cache");
      return res.json(JSON.parse(cachedOrders));
    }

    // ✅ 2. If not cached, fetch from DB
    const orders = await Order.find({ userId }).populate('customerId', 'name email');

    // ✅ 3. Save the result in Redis (with expiration of 1 hour)
    await redisClient.setEx(`orders:${userId}`, 3600, JSON.stringify(orders));

    console.log("📌 Orders fetched from MongoDB & cached");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
