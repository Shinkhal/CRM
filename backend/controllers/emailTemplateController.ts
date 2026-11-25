import { Request, Response } from 'express';
import { EmailTemplate } from '../models/EmailTemplate.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { auditContextFromRequest, diffRecords, recordAudit } from '../utils/audit.js';
import { assertString } from '../utils/validation.js';

export const getEmailTemplates = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const templates = await EmailTemplate.find({ business: businessId }).sort({ isDefault: -1, name: 1 });
  res.json({ templates });
});

export const createEmailTemplate = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const { name, subject, body, isDefault = false } = req.body;
  const templateName = assertString(name, 'name', { min: 1, max: 120 });
  const templateSubject = assertString(subject, 'subject', { min: 1, max: 300 });
  const templateBody = assertString(body, 'body', { min: 1, max: 50_000 });

  const existing = await EmailTemplate.findOne({ business: businessId, name: templateName });
  if (existing) {
    throw new AppError(`A template named "${name.trim()}" already exists`, 409);
  }

  const template = new EmailTemplate({
    name: templateName,
    subject: templateSubject,
    body: templateBody,
    isDefault: Boolean(isDefault),
    business: businessId,
    createdBy: req.user?.id,
  });

  if (template.isDefault) {
    await EmailTemplate.updateMany(
      { business: businessId, _id: { $ne: template._id } },
      { isDefault: false }
    );
  }

  await template.save();

  await recordAudit(
    auditContextFromRequest(req),
    'campaign',
    String(template._id),
    'create',
    [{ field: 'name', to: template.name }],
    template.name
  );

  res.status(201).json({ message: 'Template created successfully', template });
});

export const updateEmailTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const template = await EmailTemplate.findOne({ _id: id, business: businessId });
  if (!template) {
    throw new AppError('Template not found', 404);
  }

  const before = template.toObject();
  const { name, subject, body, isDefault } = req.body;

  if (name !== undefined) {
    template.name = assertString(name, 'name', { min: 1, max: 120 }) as string;
  }
  if (subject !== undefined) template.subject = assertString(subject, 'subject', { min: 1, max: 300 }) as string;
  if (body !== undefined) template.body = assertString(body, 'body', { min: 1, max: 50_000 }) as string;
  if (isDefault !== undefined) {
    template.isDefault = Boolean(isDefault);
    if (template.isDefault) {
      await EmailTemplate.updateMany(
        { business: businessId, _id: { $ne: template._id } },
        { isDefault: false }
      );
    }
  }

  await template.save();

  const changes = diffRecords(before, template.toObject());
  await recordAudit(
    auditContextFromRequest(req),
    'campaign',
    String(template._id),
    'update',
    changes,
    template.name
  );

  res.json({ message: 'Template updated successfully', template });
});

export const deleteEmailTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const template = await EmailTemplate.findOne({ _id: id, business: businessId });
  if (!template) {
    throw new AppError('Template not found', 404);
  }

  await template.deleteOne();

  res.json({ message: 'Template deleted successfully' });
});

export default {
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
};
