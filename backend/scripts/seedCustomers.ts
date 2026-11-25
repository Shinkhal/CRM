import mongoose from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Business } from '../models/business.js';
import { User } from '../models/User.js';
import connectDB from '../config/db.js';
import { scoreCustomer } from '../utils/segmentRules.js';

/**
 * Seeds demo contacts for a tenant.
 *
 * The tenant and its owner are resolved from the arguments or from the first
 * business in the database, because `business` and `createdBy` are required on
 * every tenant scoped record. A seed that omits them fails validation.
 *
 *   npm run seed:customers -- <businessId> <userId>
 */

await connectDB();

const [businessIdArg, userIdArg] = process.argv.slice(2);

const business = businessIdArg
  ? await Business.findById(businessIdArg)
  : await Business.findOne().sort({ createdAt: 1 });

if (!business) {
  console.error('No business found. Pass a businessId: npm run seed:customers -- <businessId> <userId>');
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

const customers = [
  { name: 'Aarav Sharma', email: 'aarav.sharma@example.com', phone: '9123456780', totalSpend: 15000, totalOrders: 5 },
  { name: 'Saanvi Verma', email: 'saanvi.verma@example.com', phone: '9123456781', totalSpend: 8000, totalOrders: 3 },
  { name: 'Vivaan Nair', email: 'vivaan.nair@example.com', phone: '9123456782', totalSpend: 12000, totalOrders: 4 },
  { name: 'Anaya Reddy', email: 'anaya.reddy@example.com', phone: '9123456783', totalSpend: 5000, totalOrders: 2 },
  { name: 'Arjun Mehta', email: 'arjun.mehta@example.com', phone: '9123456784', totalSpend: 17000, totalOrders: 6 },
  { name: 'Ishita Joshi', email: 'ishita.joshi@example.com', phone: '9123456785', totalSpend: 4000, totalOrders: 1 },
  { name: 'Reyansh Das', email: 'reyansh.das@example.com', phone: '9123456786', totalSpend: 9500, totalOrders: 3 },
  { name: 'Meera Gupta', email: 'meera.gupta@example.com', phone: '9123456787', totalSpend: 11000, totalOrders: 4 },
  { name: 'Kabir Iyer', email: 'kabir.iyer@example.com', phone: '9123456788', totalSpend: 13400, totalOrders: 5 },
  { name: 'Diya Singh', email: 'diya.singh@example.com', phone: '9123456789', totalSpend: 3000, totalOrders: 1 },
  { name: 'Krishna Patel', email: 'krishna.patel@example.com', phone: '9123456790', totalSpend: 7000, totalOrders: 2 },
  { name: 'Aanya Saxena', email: 'aanya.saxena@example.com', phone: '9123456791', totalSpend: 6000, totalOrders: 2 },
  { name: 'Aditya Rao', email: 'aditya.rao@example.com', phone: '9123456792', totalSpend: 10000, totalOrders: 3 },
  { name: 'Tara Desai', email: 'tara.desai@example.com', phone: '9123456793', totalSpend: 9000, totalOrders: 2 },
  { name: 'Rudra Malhotra', email: 'rudra.malhotra@example.com', phone: '9123456794', totalSpend: 14000, totalOrders: 4 },
];

let created = 0;

for (const entry of customers) {
  const existing = await Customer.findOne({ business: business._id, email: entry.email });
  if (existing) continue;

  const customer = new Customer({
    name: entry.name,
    email: entry.email,
    phone: entry.phone,
    totalSpend: entry.totalSpend,
    totalOrders: entry.totalOrders,
    lastOrderDate: new Date(),
    status: 'customer',
    source: 'import',
    business: business._id,
    createdBy: owner._id,
  });

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
  created += 1;
}

console.log(`Seeded ${created} customers for business "${business.name}"`);
await mongoose.disconnect();
