import { Request, Response } from 'express';
import Business, { DEFAULT_MODULES } from '../models/business.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../services/emailSender.js';
import { env } from '../config/env.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { UserRole } from '../types/index.js';

interface InviteJwtPayload {
  email: string;
  businessId: string;
  role: UserRole;
}

export const inviteMember = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body;
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!['admin', 'manager', 'viewer'].includes(role)) throw new AppError('Invalid role', 400);
  if (!email || !role) {
    throw new AppError('Email and role are required', 400);
  }

  const business = await Business.findById(req.user?.businessId);
  if (!business) {
    throw new AppError('Business not found', 404);
  }

  if (req.user?.role !== 'admin') {
    throw new AppError('Only admins can invite team members', 403);
  }

  // Check if a user with this email exists
  const existingUser = await User.findOne({ email });

  // If user exists, make sure they’re not already part of this business
  const alreadyMember =
    existingUser &&
    business.users.some(
      (u: any) => u.toString() === existingUser._id.toString()
    );

  const alreadyInvited = business.pendingInvites.some(
    (inv: any) => inv.email === email
  );

  if (alreadyMember || alreadyInvited) {
    throw new AppError('User already exists or is already invited', 400);
  }

  // Generate invite token
  const token = jwt.sign(
    { email, businessId: business._id, role },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Save invite
  business.pendingInvites.push({ email, role, token });
  await business.save();

  // Send invitation email
  const inviteLink = `${env.SERVER_URL}/auth/google?inviteToken=${token}`;

  const emailSubject = `You're invited to join ${business.name}!`;
  const emailBody = generateInviteEmailHTML({
    businessName: business.name,
    role,
    inviteLink,
    email,
  });

  const emailResult = await sendEmail(email, emailSubject, emailBody, true);
  if (!emailResult.success) {
    logger.error('Failed to send invite email', { error: emailResult.error, service: 'businessController' });
    throw new AppError('Failed to send invitation email', 500);
  }

  logger.info('Invite sent successfully', { email, businessId: business._id, role, service: 'businessController' });
  res.json({ message: `Invite sent to ${email}` });
});

export const acceptInvite = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    throw new AppError('Token is required', 400);
  }

  let decoded: InviteJwtPayload;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET) as InviteJwtPayload;
  } catch {
    throw new AppError('Invalid or expired token', 400);
  }

  const { email, businessId, role } = decoded;

  // Ensure the logged-in user email matches invite
  if (req.user?.email !== email) {
    throw new AppError('Invite not valid for this account', 403);
  }

  const business = await Business.findById(businessId);
  if (!business) {
    throw new AppError('Business not found', 404);
  }

  const pendingInvite = business.pendingInvites.find(
    (inv: any) => inv.email === email && inv.token === token
  );
  if (!pendingInvite) {
    throw new AppError('Invitation not found or already used', 400);
  }

  // Check if user already belongs to another business
  const alreadyInBusiness = await Business.findOne({ users: req.user.id });
  if (alreadyInBusiness && alreadyInBusiness._id.toString() !== businessId.toString()) {
    throw new AppError('User already belongs to another business', 400);
  }

  // Add user to business users
  if (!business.users.some((id: any) => id.toString() === req.user?.id.toString())) {
    business.users.push(req.user.id as any);
  }

  // Remove from pending invites
  business.pendingInvites = business.pendingInvites.filter((inv: any) => inv.token !== token);

  const user = await User.findById(req.user.id);
  if (user) {
    user.business = business._id;
    user.role = role;
    await user.save();
  }

  await business.save();

  // Send welcome email
  const welcomeSubject = `Welcome to ${business.name}!`;
  const welcomeEmailBody = generateWelcomeEmailHTML({
    businessName: business.name,
    userName: req.user.name || req.user.email,
    role,
  });

  const welcomeEmailResult = await sendEmail(
    req.user.email,
    welcomeSubject,
    welcomeEmailBody,
    true
  );

  if (!welcomeEmailResult.success) {
    logger.warn('Failed to send welcome email', { error: welcomeEmailResult.error, service: 'businessController' });
  }

  logger.info('User joined business successfully', {
    userId: req.user.id,
    businessId: business._id,
    role,
    service: 'businessController',
  });

  res.json({ message: 'Joined business successfully' });
});

export const getTeam = asyncHandler(async (req: Request, res: Response) => {
  const business = await Business.findById(req.user?.businessId).populate<{
    users: { _id: any; name: string; email: string; role: UserRole; status: string; lastLoginAt?: Date }[];
  }>('users', 'name email role status lastLoginAt');

  if (!business) {
    throw new AppError('Business not found', 404);
  }

  res.json({
    users: business.users.map((user: any) => ({ user, role: user.role, status: user.status })),
    pendingInvites: business.pendingInvites.map(({ email, role, invitedAt }) => ({ email, role, invitedAt })),
  });
});

export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!['admin', 'manager', 'viewer'].includes(role)) {
    throw new AppError('Invalid role provided', 400);
  }

  // Check if user exists and belongs to the same business
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.business || user.business.toString() !== req.user?.businessId.toString()) {
    throw new AppError('User not in your business', 403);
  }

  // Update role
  user.role = role as UserRole;
  await user.save();

  // Fetch updated business users with populated user info
  const business = await Business.findById(req.user?.businessId).populate<{
    users: { _id: any; name: string; email: string; role: UserRole }[];
  }>({
    path: 'users',
    select: '_id name email role',
  });

  if (!business) {
    throw new AppError('Business not found', 404);
  }

  const usersWithRole = business.users.map((u: any) => ({ user: u, role: u.role }));

  logger.info('Member role updated successfully', {
    targetUserId: userId,
    newRole: role,
    businessId: req.user?.businessId,
    service: 'businessController',
  });

  res.json({
    message: 'Role updated successfully',
    users: usersWithRole,
    pendingInvites: business.pendingInvites.map(({ email, role, invitedAt }) => ({ email, role, invitedAt })),
  });
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const business = await Business.findById(req.user?.businessId);
  if (!business) {
    throw new AppError('Business not found', 404);
  }

  if (req.user?.role !== 'admin') {
    throw new AppError('Only admins can remove members', 403);
  }

  if (!business.users.some((id: any) => id.toString() === userId.toString())) {
    throw new AppError('User not found in team', 404);
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new AppError('User not found', 404);
  }

  // Prevent removing the only admin
  if (targetUser.role === 'admin') {
    const adminCount = await User.countDocuments({
      business: req.user?.businessId,
      role: 'admin',
    });
    if (adminCount <= 1) {
      throw new AppError('Cannot remove the only admin', 400);
    }
  }

  // Remove member & deactivate their status
  business.users = business.users.filter((id: any) => id.toString() !== userId.toString());
  await business.save();

  targetUser.business = undefined;
  targetUser.role = 'viewer';
  targetUser.status = 'deactivated';
  await targetUser.save();

  // Return updated populated list
  const updatedBusiness = await Business.findById(req.user?.businessId).populate<{
    users: { _id: any; name: string; email: string; role: UserRole }[];
  }>('users', 'name email role');

  if (!updatedBusiness) {
    throw new AppError('Business not found', 404);
  }

  logger.info('Member removed from team', {
    targetUserId: userId,
    businessId: req.user?.businessId,
    service: 'businessController',
  });

  res.json({
    message: 'Member removed successfully',
    users: updatedBusiness.users.map((u: any) => ({ user: u, role: u.role, status: u.status })),
    pendingInvites: updatedBusiness.pendingInvites,
  });
});

export const updateMemberStatus = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { status } = req.body;

  if (!['active', 'suspended', 'deactivated'].includes(status)) {
    throw new AppError('Invalid status. Allowed: active, suspended, deactivated', 400);
  }

  const business = await Business.findById(req.user?.businessId);
  if (!business) {
    throw new AppError('Business not found', 404);
  }

  if (req.user?.role !== 'admin') {
    throw new AppError('Only admins can change member status', 403);
  }

  const targetUser = await User.findById(userId);
  if (!targetUser || !business.users.some((id: any) => id.toString() === userId.toString())) {
    throw new AppError('User not found in your team', 404);
  }

  if (targetUser._id.toString() === req.user?.id.toString()) {
    throw new AppError('You cannot change your own status', 400);
  }

  targetUser.status = status;
  await targetUser.save();

  logger.info('Member status updated', {
    targetUserId: userId,
    status,
    businessId: req.user?.businessId,
    service: 'businessController',
  });

  const updatedBusiness = await Business.findById(req.user?.businessId).populate<{
    users: { _id: any; name: string; email: string; role: UserRole; status: string }[];
  }>('users', 'name email role status');

  res.json({
    message: `Member status updated to ${status}`,
    users: updatedBusiness?.users.map((u: any) => ({ user: u, role: u.role, status: u.status })) || [],
  });
});

export const MODULE_CATALOG = [
  {
    id: 'sales_pipeline',
    name: 'Sales Pipeline & Deals',
    category: 'Sales',
    icon: 'Kanban',
    badge: 'Core',
    summary: 'Frappe CRM-style Deals Kanban board, stage progression, probability forecasting, and value tracking.',
    features: [
      'Visual multi-stage Kanban board',
      'Deal value forecasting & weighted win probabilities',
      'Stage movement history & closing timeline',
      'Linked customer context & contact details',
    ],
  },
  {
    id: 'organizations',
    name: 'B2B Organizations & Accounts',
    category: 'Sales',
    icon: 'Building2',
    badge: 'Enterprise',
    summary: 'Manage corporate accounts, link multiple client contacts, track company revenue, and company deals.',
    features: [
      'Company accounts directory with industry classification',
      'Aggregate revenue and deal value per organization',
      'Associate multiple customer contacts to corporate accounts',
      'Enterprise company profile and website linking',
    ],
  },
  {
    id: 'campaigns',
    name: 'Marketing Campaigns & Segments',
    category: 'Marketing',
    icon: 'Megaphone',
    badge: 'Popular',
    summary: 'Targeted broadcast campaigns, AI-assisted rule segmentation, and HTML email delivery tracking.',
    features: [
      'Smart customer audience filtering',
      'HTML email delivery simulator',
      'Campaign performance logs & delivery rates',
      'AI prompt-to-segment query conversion',
    ],
  },
  {
    id: 'orders',
    name: 'Order Tracking & Commerce',
    category: 'Sales',
    icon: 'ShoppingCart',
    badge: 'Essential',
    summary: 'Track customer order values, purchase frequency, and revenue metrics across your business.',
    features: [
      'Order creation & customer lifetime spend updates',
      'Cached high-performance order retrieval',
      'Customer order history view',
      'Real-time revenue metric contributions',
    ],
  },
  {
    id: 'ai_insights',
    name: 'AI Growth Intelligence',
    category: 'Intelligence',
    icon: 'Sparkles',
    badge: 'AI Pro',
    summary: 'Deep data analysis powered by Google Gemini generating actionable revenue expansion strategies.',
    features: [
      'Automated 3-point business growth roadmaps',
      'AI marketing copy generation',
      'Data sanitization & contextual synthesis',
      'Automated customer retention tips',
    ],
  },
  {
    id: 'tasks',
    name: 'Tasks & Activity Follow-ups',
    category: 'Productivity',
    icon: 'CheckSquare',
    badge: 'New',
    summary: 'Organize sales follow-ups, scheduled calls, meetings, and customer action checklists.',
    features: [
      'Priority levels & due date reminders',
      'Link tasks to customers or deals',
      'Status tracking (Todo, In Progress, Completed)',
      'Sales team activity checklist',
    ],
  },
];

export const getModules = asyncHandler(async (req: Request, res: Response) => {
  const business = await Business.findById(req.user?.businessId);
  if (!business) {
    throw new AppError('Business not found', 404);
  }

  const enabledModules = business.enabledModules || DEFAULT_MODULES;

  const catalog = MODULE_CATALOG.map((mod) => ({
    ...mod,
    enabled: enabledModules.includes(mod.id),
  }));

  res.json({
    enabledModules,
    modules: catalog,
    settings: business.settings || { currency: 'INR' },
  });
});

export const toggleModule = asyncHandler(async (req: Request, res: Response) => {
  const { moduleId, enabled } = req.body;

  if (!moduleId || typeof enabled !== 'boolean') {
    throw new AppError('moduleId and enabled boolean are required', 400);
  }

  const validIds = MODULE_CATALOG.map((m) => m.id);
  if (!validIds.includes(moduleId)) {
    throw new AppError(`Invalid module id: ${moduleId}`, 400);
  }

  const business = await Business.findById(req.user?.businessId);
  if (!business) {
    throw new AppError('Business not found', 404);
  }

  let currentModules = business.enabledModules || [...DEFAULT_MODULES];

  if (enabled) {
    if (!currentModules.includes(moduleId)) {
      currentModules.push(moduleId);
    }
  } else {
    currentModules = currentModules.filter((id) => id !== moduleId);
  }

  business.enabledModules = currentModules;
  await business.save();

  logger.info('Module toggled successfully', {
    moduleId,
    enabled,
    businessId: business._id,
    service: 'businessController',
  });

  const catalog = MODULE_CATALOG.map((mod) => ({
    ...mod,
    enabled: currentModules.includes(mod.id),
  }));

  res.json({
    message: `Module ${moduleId} ${enabled ? 'enabled' : 'disabled'} successfully`,
    enabledModules: currentModules,
    modules: catalog,
  });
});

export const getCustomFields = asyncHandler(async (req: Request, res: Response) => {
  const business = await Business.findById(req.user?.businessId);
  if (!business) {
    throw new AppError('Business not found', 404);
  }

  res.json({ customFields: business.settings?.customFields || [] });
});

export const addCustomField = asyncHandler(async (req: Request, res: Response) => {
  const business = await Business.findById(req.user?.businessId);
  if (!business) {
    throw new AppError('Business not found', 404);
  }

  const { entity, label, type = 'text', options = [], required = false } = req.body;

  if (!entity || !label) {
    throw new AppError('entity and label are required', 400);
  }

  // The entity and the type are part of the stored contract, so an unknown
  // value is rejected with a 400 rather than failing as a raw validation
  // error on save.
  const validEntities = ['deal', 'customer', 'organization'];
  const validTypes = ['text', 'number', 'select', 'date'];

  if (!validEntities.includes(entity)) {
    throw new AppError(`Invalid entity: ${entity}. Expected one of ${validEntities.join(', ')}`, 400);
  }
  if (!validTypes.includes(type)) {
    throw new AppError(`Invalid type: ${type}. Expected one of ${validTypes.join(', ')}`, 400);
  }
  if (type === 'select' && (!Array.isArray(options) || options.length === 0)) {
    throw new AppError('A select field needs at least one option', 400);
  }

  const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_');

  if (!business.settings) {
    business.settings = { currency: 'INR', pipelineStages: ['lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost'], customFields: [] };
  }
  if (!business.settings.customFields) {
    business.settings.customFields = [];
  }

  const existing = business.settings.customFields.find((f) => f.key === key && f.entity === entity);
  if (existing) {
    throw new AppError(`A custom field with key '${key}' already exists for ${entity}`, 400);
  }

  const newField = {
    id: `cf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    entity,
    label: label.trim(),
    key,
    type,
    options: Array.isArray(options) ? options : [],
    required: Boolean(required),
  };

  business.settings.customFields.push(newField);
  business.markModified('settings');
  await business.save();

  logger.info('Custom field added', {
    businessId: business._id,
    fieldKey: key,
    entity,
    service: 'businessController',
  });

  res.status(201).json({ message: 'Custom field added successfully', field: newField, customFields: business.settings.customFields });
});

export const deleteCustomField = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const business = await Business.findById(req.user?.businessId);
  if (!business) {
    throw new AppError('Business not found', 404);
  }

  if (business.settings && business.settings.customFields) {
    business.settings.customFields = business.settings.customFields.filter((f) => f.id !== id);
    business.markModified('settings');
    await business.save();
  }

  logger.info('Custom field removed', {
    businessId: business._id,
    fieldId: id,
    service: 'businessController',
  });

  res.json({ message: 'Custom field removed successfully', customFields: business.settings?.customFields || [] });
});

// --------------------
const generateInviteEmailHTML = ({
  businessName,
  role,
  inviteLink,
  email,
}: {
  businessName: string;
  role: string;
  inviteLink: string;
  email: string;
}) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 0;
                background-color: #f4f4f4;
            }
            .email-container {
                background-color: #ffffff;
                margin: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 300;
            }
            .content {
                padding: 40px 30px;
            }
            .business-name {
                color: #667eea;
                font-weight: 600;
                font-size: 18px;
            }
            .role-badge {
                display: inline-block;
                background-color: #e8f2ff;
                color: #2563eb;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 500;
                margin: 10px 0;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: 600;
                margin: 20px 0;
                transition: transform 0.2s;
            }
            .cta-button:hover {
                transform: translateY(-2px);
            }
            .info-box {
                background-color: #f8fafc;
                border-left: 4px solid #667eea;
                padding: 20px;
                margin: 20px 0;
                border-radius: 0 5px 5px 0;
            }
            .footer {
                background-color: #f8fafc;
                padding: 20px 30px;
                text-align: center;
                color: #666;
                font-size: 14px;
                border-top: 1px solid #e2e8f0;
            }
            .expires-note {
                color: #e53e3e;
                font-size: 14px;
                margin-top: 20px;
            }
            @media only screen and (max-width: 600px) {
                .email-container {
                    margin: 10px;
                }
                .content {
                    padding: 20px;
                }
                .header {
                    padding: 20px;
                }
                .header h1 {
                    font-size: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>🎉 You're Invited!</h1>
            </div>
            
            <div class="content">
                <p>Hello,</p>
                
                <p>You have been invited to join the team at <span class="business-name">${businessName}</span>.</p>
                
                <div class="info-box">
                    <h3 style="margin-top: 0; color: #2d3748;">Invitation Details</h3>
                    <p><strong>Business:</strong> ${businessName}</p>
                    <p><strong>Role:</strong> <span class="role-badge">${role.charAt(0).toUpperCase() + role.slice(1)}</span></p>
                    <p><strong>Email:</strong> ${email}</p>
                </div>
                
                <p>Click the button below to accept your invitation and join the team:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${inviteLink}" class="cta-button">Accept Invitation</a>
                </div>
                
                <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
                <p style="background-color: #f1f5f9; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 14px;">
                    ${inviteLink}
                </p>
                
                <div class="expires-note">
                    ⚠️ <strong>Important:</strong> This invitation will expire in 7 days.
                </div>
            </div>
            
            <div class="footer">
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                <p>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// --------------------
// Generate welcome email template
// --------------------
const generateWelcomeEmailHTML = ({
  businessName,
  userName,
  role,
}: {
  businessName: string;
  userName: string;
  role: string;
}) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${businessName}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 0;
                background-color: #f4f4f4;
            }
            .email-container {
                background-color: #ffffff;
                margin: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 300;
            }
            .content {
                padding: 40px 30px;
            }
            .business-name {
                color: #48bb78;
                font-weight: 600;
                font-size: 18px;
            }
            .role-badge {
                display: inline-block;
                background-color: #f0fff4;
                color: #22543d;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 500;
                margin: 10px 0;
            }
            .footer {
                background-color: #f8fafc;
                padding: 20px 30px;
                text-align: center;
                color: #666;
                font-size: 14px;
                border-top: 1px solid #e2e8f0;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>🎊 Welcome to the Team!</h1>
            </div>
            
            <div class="content">
                <p>Hi ${userName},</p>
                
                <p>Welcome to <span class="business-name">${businessName}</span>! We're excited to have you on board as a <span class="role-badge">${role.charAt(0).toUpperCase() + role.slice(1)}</span>.</p>
                
                <p>You now have access to your team dashboard and can start collaborating with your colleagues right away.</p>
                
                <p>If you have any questions or need help getting started, don't hesitate to reach out to your team members.</p>
                
                <p>Welcome aboard! 🚀</p>
            </div>
            
            <div class="footer">
                <p>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};