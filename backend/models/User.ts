import mongoose, { Document, Types, Model } from "mongoose";

export type UserStatus = 'active' | 'suspended' | 'deactivated';
export type UserRole = 'admin' | 'manager' | 'viewer';

export interface IUser {
  googleId?: string;
  email: string;
  password?: string;
  name?: string;
  image?: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  business?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserDocument = IUser & Document;

const userSchema = new mongoose.Schema<IUser>(
  {
    /**
     * Google account id. A plain `unique: true` on the path creates a
     * non-sparse unique index in MongoDB, which then treats every user
     * without a Google account as a duplicate `googleId: null`. The partial
     * index declared below only covers real string values.
     */
    googleId: { type: String },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, select: false },
    name: { type: String, trim: true },
    image: { type: String },
    role: {
      type: String,
      enum: ['admin', 'manager', 'viewer'],
      default: 'viewer',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'deactivated'],
      default: 'active',
      index: true,
    },
    isEmailVerified: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      index: true,
    },
  },
  { timestamps: true }
);

userSchema.index({ business: 1, role: 1 });
userSchema.index(
  { googleId: 1 },
  {
    unique: true,
    partialFilterExpression: { googleId: { $type: 'string' } },
    name: 'googleId_1',
  }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);
export default User;
