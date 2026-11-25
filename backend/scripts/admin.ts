import mongoose from 'mongoose';
import User from '../models/User.js';
import Business from '../models/business.js';
import connectDB from '../config/db.js';
import { logger } from '../utils/logger.js';

await connectDB();

const migrateUsers = async () => {
  try {
    const users = await User.find({ business: { $exists: false } });

    for (const user of users) {
      const business = new Business({
        name: `${user.name || 'Unknown'}'s Business`,
        owner: user._id,
      });
      await business.save();

      user.business = business._id;
      user.role = 'admin';
      await user.save();

      logger.info(`Migrated user ${user.email}`, { userId: user._id, service: 'migration' });
    }

    logger.info('Migration complete!', { migratedCount: users.length, service: 'migration' });
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', {
      error: error instanceof Error ? error.message : String(error),
      service: 'migration',
    });
    process.exit(1);
  }
};

migrateUsers().finally(async () => {
  await mongoose.disconnect();
});
