// models/Business.js
import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    industry: String,

    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    users: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: {
          type: String,
          enum: ["admin", "manager", "viewer"],
          default: "viewer",
        },
      },
    ],

    pendingInvites: [
      {
        email: { type: String, required: true },
        role: {
          type: String,
          enum: ["manager", "viewer"], 
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
