import mongoose, { Document, Types, Model } from "mongoose";

export interface INote {
  content: string;
  isPinned: boolean;
  relatedDeal?: Types.ObjectId;
  relatedCustomer?: Types.ObjectId;
  relatedOrganization?: Types.ObjectId;
  business: Types.ObjectId;
  author: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type NoteDocument = INote & Document;

const noteSchema = new mongoose.Schema<INote>(
  {
    content: { type: String, required: true, trim: true },
    isPinned: { type: Boolean, default: false },
    relatedDeal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', index: true },
    relatedCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    relatedOrganization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

noteSchema.index({ business: 1, relatedDeal: 1, createdAt: -1 });
noteSchema.index({ business: 1, relatedCustomer: 1, createdAt: -1 });

export const Note: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>('Note', noteSchema);

export default Note;
