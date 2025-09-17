import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    segmentRules: { type: mongoose.Schema.Types.Mixed, required: true },
    audienceSize: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  },
  { timestamps: true }
);

export const Campaign = mongoose.model('Campaign', campaignSchema);
