import mongoose from 'mongoose';
import { Business } from '../models/business.js';
import type { UserDocument } from '../models/User.js';
import { AppError } from '../utils/errorHandler.js';

/** Consume exactly the pending token and create its member as one transaction. */
export const joinWithInvitation = async (user: UserDocument, token: string) => {
  await mongoose.connection.transaction(async session => {
    const business = await Business.findOneAndUpdate({
      _id: user.business,
      pendingInvites: { $elemMatch: { token, email: user.email, role: user.role } },
    }, {
      $pull: { pendingInvites: { token } },
      $addToSet: { users: user._id },
    }, { session, new: true });
    if (!business) throw new AppError('This invitation has already been used or withdrawn', 400);
    await user.save({ session });
  });
};
