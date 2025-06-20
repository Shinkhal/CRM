import mongoose from "mongoose";
const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    segmentRules: { type: mongoose.Schema.Types.Mixed, required: true },
    audienceSize: { type: Number },
    createdBy: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Campaign = mongoose.model('Campaign', campaignSchema);
