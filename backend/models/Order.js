import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: true },
    orderDate: { type: Date, default: Date.now },

    // Instead of userId, link to business
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who added the order
  },
  { timestamps: true }
);

export const Order = mongoose.model('Order', orderSchema);
