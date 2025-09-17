import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    phone: { type: String },
    totalSpend: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    lastOrderDate: { type: Date },
    createdAt: { type: Date, default: Date.now },
    
    // Instead of userId, link to the business
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // optional: track who added
  },
  { timestamps: true }
);

export const Customer = mongoose.model('Customer', customerSchema);
