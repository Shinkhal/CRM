// controllers/customerController.js
import { Customer } from '../models/Customer.js';
import redisClient from '../config/redis.js';

// --------------------
// Create a new customer
// --------------------
export const createCustomer = async (req, res) => {
  try {
    const customer = new Customer({
      ...req.body,
      business: req.user.businessId, // associate customer with business
      createdBy: req.user.id        // optional: track who created it
    });

    await customer.save();

    // Invalidate cache for this business
    await redisClient.del(`customers:${req.user.businessId}`);

    res.status(201).json({ message: 'Customer created', customer });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(400).json({ error: error.message });
  }
};

// --------------------
// Get all customers for the business
// --------------------
export const getCustomers = async (req, res) => {
  try {
    const cacheKey = `customers:${req.user.businessId}`;
    const cachedCustomers = await redisClient.get(cacheKey);

    if (cachedCustomers) {
      console.log('Returning customers from Redis cache');
      return res.json(JSON.parse(cachedCustomers));
    }

    // Fetch all customers associated with the business
    const customers = await Customer.find({ business: req.user.businessId });

    // Cache for 1 hour
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(customers));

    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: error.message });
  }
};
