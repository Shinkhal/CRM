import mongoose, { Document, Types, Model } from 'mongoose';

/**
 * Field-level change history. Equivalent to HubSpot's property history and
 * Frappe's `Version` doctype, both of which record who changed what and when.
 */
export type AuditEntity =
  | 'deal'
  | 'customer'
  | 'organization'
  | 'task'
  | 'note'
  | 'campaign'
  | 'order'
  | 'pipeline'
  | 'workflow'
  | 'notification'
  | 'user';

export type AuditAction = 'create' | 'update' | 'delete';

export interface IAuditChange {
  field: string;
  from?: any;
  to?: any;
}

export interface IAuditLog {
  entity: AuditEntity;
  entityId: Types.ObjectId;
  action: AuditAction;
  label?: string;
  changes: IAuditChange[];
  actor?: Types.ObjectId;
  actorRole?: string;
  ip?: string;
  userAgent?: string;
  business: Types.ObjectId;
  createdAt?: Date;
}

export type AuditLogDocument = IAuditLog & Document;

const auditLogSchema = new mongoose.Schema<IAuditLog>(
  {
    entity: {
      type: String,
      enum: [
        'deal',
        'customer',
        'organization',
        'task',
        'note',
        'campaign',
        'order',
        'pipeline',
        'workflow',
        'notification',
        'user',
      ],
      required: true,
      index: true,
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    action: { type: String, enum: ['create', 'update', 'delete'], required: true },
    label: { type: String, trim: true },
    changes: {
      type: [
        {
          field: { type: String, required: true },
          from: { type: mongoose.Schema.Types.Mixed },
          to: { type: mongoose.Schema.Types.Mixed },
        },
      ],
      default: [],
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ business: 1, entity: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ business: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog;
