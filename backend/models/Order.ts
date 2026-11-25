import mongoose, { Document, Types, Model } from "mongoose";

export interface IOrder {
  customerId: Types.ObjectId;
  amount: number;
  orderDate?: Date;
  business: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OrderDocument = IOrder & Document;

const orderSchema = new mongoose.Schema<IOrder>(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: true },
    orderDate: { type: Date, default: Date.now },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

orderSchema.index({ business: 1, createdAt: -1 });
orderSchema.index({ business: 1, customerId: 1 });

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema);
export default Order;
