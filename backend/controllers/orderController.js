import { Order } from '../models/Order.js';
import { Customer } from '../models/Customer.js';
import redisClient from '../config/redis.js';

// Create Order
export const createOrder = async (req, res) => {
  try {
    const { customerId, amount } = req.body;
    const order = new Order({
      customerId,
      amount,
      business: req.user.businessId, // assign to business
      createdBy: req.user.id
    });
    await order.save();

    // Update customer stats
    const customer = await Customer.findById(customerId);
    if (customer) {
      const numericAmount = Number(amount);
      customer.totalSpend += numericAmount;
      customer.totalOrders += 1;
      customer.lastOrderDate = new Date();
      await customer.save();
    }

    // Invalidate cache for all team members
    await redisClient.del(`orders:${req.user.businessId}`);

    res.status(201).json({ message: 'Order created', order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get Orders for Business
export const getOrders = async (req, res) => {
  try {
    const cacheKey = `orders:${req.user.businessId}`;
    const cachedOrders = await redisClient.get(cacheKey);
    if (cachedOrders) {
      console.log("Orders fetched from Redis cache");
      return res.json(JSON.parse(cachedOrders));
    }

    const orders = await Order.find({ business: req.user.businessId })
      .populate('customerId', 'name email')
      .populate('createdBy', 'name email');

    await redisClient.setEx(cacheKey, 3600, JSON.stringify(orders));

    console.log("Orders fetched from MongoDB & cached");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
