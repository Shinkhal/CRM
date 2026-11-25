import mongoose, { Document, Types, Model } from "mongoose";

export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface ITask {
  title: string;
  description?: string;
  dueDate?: Date;
  priority: TaskPriority;
  status: TaskStatus;
  relatedCustomer?: Types.ObjectId;
  relatedDeal?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  business: Types.ObjectId;
  createdBy: Types.ObjectId;
  completedAt?: Date;
  /** Set when the overdue sweep has raised `task.overdue` for this task. */
  overdueNotifiedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TaskDocument = ITask & Document;

const taskSchema = new mongoose.Schema<ITask>(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    dueDate: { type: Date },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'completed'],
      default: 'todo',
    },
    relatedCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    relatedDeal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: { type: Date },
    overdueNotifiedAt: { type: Date },
  },
  { timestamps: true }
);

taskSchema.index({ business: 1, relatedDeal: 1 });
taskSchema.index({ business: 1, relatedCustomer: 1 });
taskSchema.index({ business: 1, status: 1, dueDate: 1 });
taskSchema.index({ business: 1, assignedTo: 1, status: 1 });
// The overdue sweep filters on the due date across every tenant, so it needs
// its own index: every other index starts with `business` and could not be
// used for a query without a tenant term.
taskSchema.index({ overdueNotifiedAt: 1, dueDate: 1, status: 1 });

export const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>('Task', taskSchema);
export default Task;
