// models/Business.js
import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    industry: String,

    // Business always has one owner (admin by default)
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // List of users in this business (no role here, role lives in User now)
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Pending invites still need role → keep role here
    pendingInvites: [
      {
        email: { type: String, required: true },
        role: {
          type: String,
          enum: ["manager", "viewer"], // invited role
          required: true,
        },
        token: String,
        invitedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Business =
  mongoose.models.Business || mongoose.model("Business", businessSchema);
export default Business;
