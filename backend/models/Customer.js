import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    phone: { type: String },
    totalSpend: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    lastOrderDate: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Customer = mongoose.model('Customer', customerSchema);
