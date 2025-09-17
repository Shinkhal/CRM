import mongoose from "mongoose";

const communicationLogSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    message: { type: String },
    status: { type: String, enum: ['SENT', 'FAILED'], default: 'SENT' },
    vendorResponse: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true }, // added
  },
  { timestamps: true }
);

export const CommunicationLog = mongoose.model('CommunicationLog', communicationLogSchema);
