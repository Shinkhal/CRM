import { Workflow } from '../models/Workflow.js';
import { logger } from '../utils/logger.js';

/**
 * Starter workflows.
 *
 * They exist so a new workspace has a set of working examples to learn from
 * rather than an empty editor. They are modelled on the reference flows that
 * ship with Frappe CRM: a welcome sequence, a high value deal watch, a
 * qualified lead scoring rule and a post-mortem on a lost deal.
 *
 * They are created **disabled**. A workflow that sends mail or creates tasks
 * should be a deliberate choice, so enabling one is an explicit action.
 */
export const STARTER_WORKFLOWS = [
  {
    name: 'Welcome a new lead',
    description:
      'Sends a welcome note to a new lead, waits two days, then follows up. The wait is resumable, so a restart does not lose the sequence.',
    trigger: { event: 'customer.created', filters: [] },
    conditions: "doc.status == 'lead'",
    actions: [
      {
        actionType: 'send_email',
        params: {
          to: '{{doc.email}}',
          subject: 'Welcome, {{doc.name}}',
          body: 'Hi {{doc.name}},\n\nThanks for getting in touch. Someone from our team will be in touch shortly.\n\nBest regards,\nThe sales team',
        },
      },
      {
        actionType: 'wait',
        params: { duration: '2 days' },
      },
      {
        actionType: 'send_email',
        params: {
          to: '{{doc.email}}',
          subject: 'Just checking in, {{doc.name}}',
          body: 'Hi {{doc.name}},\n\nDid you get a chance to look at what we sent over? Happy to answer any questions.\n\nBest regards,\nThe sales team',
        },
      },
    ],
  },
  {
    name: 'Watch high value deals',
    description:
      'When a deal crosses a stage worth more than 50,000, a review task is created and the record owner is notified.',
    trigger: { event: 'deal.stage_changed', filters: [] },
    conditions: 'doc.value >= 50000',
    actions: [
      {
        actionType: 'create_task',
        params: {
          title: 'Review the high value deal: {{doc.title}}',
          description: 'This deal is worth {{doc.value}}. Check the pricing and confirm the close plan.',
          dueIn: '1 day',
          priority: 'high',
          assignTo: 'owner',
        },
      },
      {
        actionType: 'send_notification',
        params: {
          recipients: 'owner',
          title: 'High value deal needs attention',
          message: '{{doc.title}} is worth {{doc.value}} and just moved stage.',
        },
      },
    ],
  },
  {
    name: 'Score a qualified lead',
    description:
      'A qualified lead gains score and moves to the hot band, so it surfaces at the top of the lead list.',
    trigger: { event: 'customer.status_changed', filters: [] },
    conditions: "doc.status == 'qualified'",
    actions: [
      {
        actionType: 'adjust_lead_score',
        params: { amount: 25, reason: 'Marked as qualified', minScore: 0, maxScore: 100 },
      },
      {
        actionType: 'set_lead_temperature',
        params: { temperature: 'hot' },
      },
    ],
  },
  {
    name: 'Post mortem on a lost deal',
    description:
      'When a deal is lost, a short review task is created so the reason does not get lost.',
    trigger: { event: 'deal.lost', filters: [] },
    conditions: '',
    actions: [
      {
        actionType: 'create_task',
        params: {
          title: 'Post mortem: {{doc.title}}',
          description: 'The deal was lost. Reason: {{doc.lostReason}}. Capture what we learned.',
          dueIn: '3 days',
          priority: 'medium',
          assignTo: 'owner',
        },
      },
      {
        actionType: 'add_note',
        params: {
          content: 'Deal "{{doc.title}}" was lost. Reason: {{doc.lostReason}}. Notes: {{doc.lostNotes}}',
        },
      },
    ],
  },
  {
    name: 'Follow up on a stalled deal',
    description:
      'A deal that reaches a late stage gets a scheduled follow-up task so it does not go quiet.',
    trigger: { event: 'deal.stage_changed', filters: [] },
    conditions: 'doc.probability >= 50',
    actions: [
      {
        actionType: 'create_task',
        params: {
          title: 'Follow up: {{doc.title}}',
          description: 'This deal is in a late stage. Check in with the customer.',
          dueIn: '2 days',
          priority: 'medium',
          assignTo: 'owner',
        },
      },
    ],
  },
];

/**
 * Creates the starter workflows for a tenant that has none. Existing
 * workflows are never touched, and a tenant that deleted a starter workflow
 * does not get it back.
 */
export const ensureStarterWorkflows = async (
  businessId: string,
  createdBy?: string
): Promise<void> => {
  try {
    const existing = await Workflow.countDocuments({ business: businessId });
    if (existing > 0) return;

    await Workflow.insertMany(
      STARTER_WORKFLOWS.map((template) => ({
        ...template,
        // The starters are created disabled. A workflow that sends mail or
        // creates tasks should be a deliberate choice, not a side effect of
        // creating a workspace.
        enabled: false,
        actions: template.actions.map((action: any, index: number) => ({
          id: `step_${index + 1}`,
          actionType: action.actionType,
          params: action.params || {},
          condition: undefined,
          continueOnError: false,
        })),
        business: businessId,
        createdBy,
      }))
    );

    logger.info('Starter workflows created', {
      businessId,
      count: STARTER_WORKFLOWS.length,
      service: 'workflowTemplates',
    });
  } catch (error) {
    logger.warn('Could not create the starter workflows', {
      businessId,
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'workflowTemplates',
    });
  }
};

export default { STARTER_WORKFLOWS, ensureStarterWorkflows };
