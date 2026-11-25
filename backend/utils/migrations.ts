import mongoose from 'mongoose';
import { Campaign } from '../models/Campaign.js';
import { CommunicationLog } from '../models/CommunicationLog.js';
import { logger } from './logger.js';

/**
 * One-off, idempotent data and index migrations.
 *
 * These run on boot because the corrections they apply cannot be expressed
 * as a Mongoose model definition alone:
 *
 * 1. `users.googleId` had a *non-sparse* unique index in the database. Every
 *    user without a Google account was stored with `googleId: null`, so the
 *    second email/password signup failed with a duplicate key error. It has
 *    to be replaced with a partial unique index that only covers real string
 *    values.
 * 2. `customers.email` carried a *global* unique index, which stopped two
 *    different workspaces from holding the same contact address. Uniqueness
 *    belongs on `{ business, email }` instead.
 * 3. `Campaign` and `CommunicationLog` used `businessId` for the tenant while
 *    every other model used `business`. The legacy value is copied across.
 *
 * MongoDB keeps an existing index when the same key is re-declared with
 * different options, so the conflicting index has to be dropped explicitly
 * before the correct one can be created.
 */

interface IndexSpec {
  key: Record<string, 1 | -1>;
  options: {
    unique?: boolean;
    partialFilterExpression?: Record<string, unknown>;
    name: string;
  };
}

const sameOptions = (existing: any, spec: IndexSpec): boolean => {
  const existingPartial = existing.partialFilterExpression || null;
  const specPartial = spec.options.partialFilterExpression || null;
  return (
    Boolean(existing.unique) === Boolean(spec.options.unique) &&
    JSON.stringify(existingPartial) === JSON.stringify(specPartial)
  );
};

/**
 * Drops and recreates an index when the stored one does not match the
 * declared specification. A unique index that already matches is left alone.
 */
const ensureIndex = async (collectionName: string, spec: IndexSpec): Promise<void> => {
  const collection = mongoose.connection.collection(collectionName);

  let indexes: any[] = [];
  try {
    indexes = await collection.indexes();
  } catch (error) {
    logger.warn('Could not read indexes', {
      collection: collectionName,
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'migrations',
    });
    return;
  }

  const existing = indexes.find((index: any) => index.name === spec.options.name);
  if (existing) {
    if (sameOptions(existing, spec)) return;
    try {
      await collection.dropIndex(spec.options.name);
      logger.info(`Dropped conflicting index ${spec.options.name}`, {
        collection: collectionName,
        service: 'migrations',
      });
    } catch (error) {
      logger.warn('Could not drop a conflicting index', {
        collection: collectionName,
        index: spec.options.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'migrations',
      });
      return;
    }
  }

  try {
    await collection.createIndex(spec.key, spec.options as any);
    logger.info(`Created index ${spec.options.name}`, {
      collection: collectionName,
      service: 'migrations',
    });
  } catch (error) {
    // A unique index can fail when the collection already holds duplicates.
    // The application still works with a non-unique index, so this is a
    // warning rather than a fatal error.
    logger.warn('Could not create the intended index', {
      collection: collectionName,
      index: spec.options.name,
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'migrations',
    });
  }
};

const dropLegacyCustomerEmailIndex = async (): Promise<void> => {
  const collection = mongoose.connection.collection('customers');

  let indexes: any[] = [];
  try {
    indexes = await collection.indexes();
  } catch {
    return;
  }

  // The global unique index on the raw email address is the cross-tenant
  // blocker. It is replaced by the compound index below.
  const legacy = indexes.find(
    (index: any) => index.name === 'email_1' && index.key && index.key.email === 1
  );
  if (!legacy) return;

  try {
    await collection.dropIndex('email_1');
    logger.info('Dropped the global unique index on customers.email', {
      service: 'migrations',
    });
  } catch (error) {
    logger.warn('Could not drop the legacy customers.email index', {
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'migrations',
    });
  }
};

const backfillCampaignTenant = async (): Promise<void> => {
  const result = await Campaign.updateMany(
    { business: { $exists: false }, businessId: { $exists: true } },
    [{ $set: { business: '$businessId' } }]
  );
  if (result.modifiedCount > 0) {
    logger.info('Backfilled the tenant reference on campaigns', {
      count: result.modifiedCount,
      service: 'migrations',
    });
  }
};

const backfillCommunicationLogTenant = async (): Promise<void> => {
  const result = await CommunicationLog.updateMany(
    { business: { $exists: false }, businessId: { $exists: true } },
    [{ $set: { business: '$businessId' } }]
  );
  if (result.modifiedCount > 0) {
    logger.info('Backfilled the tenant reference on communication logs', {
      count: result.modifiedCount,
      service: 'migrations',
    });
  }
};

export const runMigrations = async (): Promise<void> => {
  try {
    await dropLegacyCustomerEmailIndex();

    await ensureIndex('customers', {
      key: { business: 1, email: 1 },
      options: { unique: true, name: 'business_1_email_1' },
    });

    await ensureIndex('users', {
      key: { googleId: 1 },
      options: {
        unique: true,
        partialFilterExpression: { googleId: { $type: 'string' } },
        name: 'googleId_1',
      },
    });

    await backfillCampaignTenant();
    await backfillCommunicationLogTenant();
  } catch (error) {
    // A failed migration must not stop the server from starting: the
    // application still works, it just keeps the legacy index.
    logger.warn('Data migration did not complete cleanly', {
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'migrations',
    });
  }
};

export default runMigrations;
