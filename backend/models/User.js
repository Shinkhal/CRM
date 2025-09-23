// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, unique: true, sparse: true }, // allow null until login
    email: { type: String, required: true, unique: true },
    name: String,
    image: String,

    // 🔑 Remove "role" here, role lives in Business.users[]
    business: { type: mongoose.Schema.Types.ObjectId, ref: "Business" },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
