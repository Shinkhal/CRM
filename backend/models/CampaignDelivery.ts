import mongoose from 'mongoose';

const recipientSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  totalSpend: Number,
  totalOrders: Number,
  state: { type: String, enum: ['pending', 'sending', 'SENT', 'FAILED', 'SKIPPED', 'UNKNOWN'], default: 'pending', required: true },
  claim: String,
  startedAt: Date,
  detail: String,
});

const schema = new mongoose.Schema({
  // One immutable delivery job per campaign; _id provides the unique constraint.
  _id: { type: mongoose.Schema.Types.ObjectId, required: true },
  business: { type: mongoose.Schema.Types.ObjectId, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  companyName: { type: String, required: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  recipients: { type: [recipientSchema], required: true },
  status: { type: String, enum: ['queued', 'completed'], default: 'queued', required: true },
}, { timestamps: true });
schema.index({ status: 1, createdAt: 1 });
export const CampaignDelivery = mongoose.model('CampaignDelivery', schema);
