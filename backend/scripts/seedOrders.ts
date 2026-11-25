import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Customer } from '../models/Customer.js';
import { Business } from '../models/business.js';
import { User } from '../models/User.js';
import connectDB from '../config/db.js';
import { scoreCustomer } from '../utils/segmentRules.js';

/**
 * Seeds demo orders for a tenant.
 *
 *   npm run seed:orders -- <businessId> <userId>
 *
 * `business` and `createdBy` are required on an order, so the tenant is
 * resolved from the arguments rather than assumed.
 */

await connectDB();

const [businessIdArg, userIdArg] = process.argv.slice(2);

const business = businessIdArg
  ? await Business.findById(businessIdArg)
  : await Business.findOne().sort({ createdAt: 1 });

if (!business) {
  console.error('No business found. Pass a businessId: npm run seed:orders -- <businessId> <userId>');
  await mongoose.disconnect();
  process.exit(1);
}

const owner = userIdArg
  ? await User.findById(userIdArg)
  : await User.findOne({ business: business._id }).sort({ createdAt: 1 });

if (!owner) {
  console.error('No user found for this business. Pass a userId as the second argument.');
  await mongoose.disconnect();
  process.exit(1);
}

const getRandomAmount = () => Math.floor(Math.random() * 19000) + 1000;
const getRandomCount = () => Math.floor(Math.random() * 6) + 1;

const customers = await Customer.find({ business: business._id });

let ordersCreated = 0;

for (const customer of customers) {
  const orderCount = getRandomCount();

  for (let index = 0; index < orderCount; index += 1) {
    const amount = getRandomAmount();

    const order = new Order({
      customerId: customer._id,
      amount,
      business: business._id,
      createdBy: owner._id,
    });
    await order.save();

    customer.totalSpend += amount;
    customer.totalOrders += 1;
    customer.lastOrderDate = new Date();

    const scoring = scoreCustomer({
      email: customer.email,
      totalSpend: customer.totalSpend,
      totalOrders: customer.totalOrders,
      organizationId: customer.organizationId,
    });
    customer.leadScore = scoring.score;
    customer.temperature = scoring.temperature;
    customer.leadScoreReasons = scoring.reasons;

    await customer.save();

    ordersCreated += 1;
  }
}

console.log(`Seeded ${ordersCreated} orders for ${customers.length} customers`);
await mongoose.disconnect();
