  import { Order } from '../models/Order.js';
  import { Customer } from '../models/Customer.js';

  export const createOrder = async (req, res) => {
    try {
      const { customerId, amount } = req.body;
      const order = new Order({ customerId, amount });
      await order.save();

      const customer = await Customer.findById(customerId);
      if (customer) {
        const numericAmount = Number(amount);
        customer.totalSpend += numericAmount;
        customer.totalOrders += 1;
        customer.lastOrderDate = new Date();
        await customer.save();
      }      
      res.status(201).json({ message: 'Order created', order });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

  export const getOrders = async (req, res) => {
    try {
      const orders = await Order.find().populate('customerId', 'name email');
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

