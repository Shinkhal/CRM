import { emitEvent } from './workflowEngine.js';
import { randomUUID } from 'node:crypto';
import { CampaignDelivery } from '../models/CampaignDelivery.js';
import { Campaign } from '../models/Campaign.js';
import { CommunicationLog } from '../models/CommunicationLog.js';
import { Suppression } from '../models/Suppression.js';
import { sendEmail } from './emailSender.js';
import { renderCampaignEmail, buildUnsubscribeUrl, personalize } from './campaignEmail.js';
import { logger } from '../utils/logger.js';

let timer: NodeJS.Timeout | undefined;
let active: Promise<void> | undefined;
let stopping = false;

export const processCampaignJobs = async (): Promise<void> => {
  const jobs = await CampaignDelivery.find({ status: 'queued' }).sort({ createdAt: 1 }).limit(10);
  for (const job of jobs) {
    // Never automatically resend an ambiguous SMTP attempt after a crash.
    await CampaignDelivery.updateOne({ _id: job._id }, {
      $set: { 'recipients.$[stale].state': 'UNKNOWN',
        'recipients.$[stale].detail': 'Delivery outcome unknown after interruption; review provider records before resending.' },
    }, { arrayFilters: [{ 'stale.state': 'sending', 'stale.startedAt': { $lt: new Date(Date.now() - 5 * 60000) } }] });

    for (let count = 0; count < 20 && !stopping; count += 1) {
      const claim = randomUUID();
      const claimed = await CampaignDelivery.findOneAndUpdate(
        { _id: job._id, recipients: { $elemMatch: { state: 'pending' } } },
        { $set: { 'recipients.$.state': 'sending', 'recipients.$.claim': claim, 'recipients.$.startedAt': new Date() } },
        { new: true },
      );
      if (!claimed) break;
      const recipient = claimed.recipients.find(r => r.claim === claim)!;
      let state: 'SENT' | 'SKIPPED' | 'UNKNOWN';
      let detail: string;
      const suppressed = await Suppression.exists({ business: job.business, email: recipient.email });
      if (suppressed) {
        state = 'SKIPPED';
        detail = 'Recipient is on the suppression list';
      } else {
        const html = renderCampaignEmail({ businessId: String(job.business), companyName: job.companyName,
          subject: job.subject, body: job.body,
          recipient: { _id: recipient.customerId, name: recipient.name, email: recipient.email,
            totalSpend: recipient.totalSpend ?? 0, totalOrders: recipient.totalOrders ?? 0 } });
        const unsubscribeUrl = buildUnsubscribeUrl(String(job.business), recipient.email);
        const result = await sendEmail(recipient.email, job.subject, html, true, {
          'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        });
        state = result.success ? 'SENT' : 'UNKNOWN';
        detail = result.success ? `Message ID: ${result.messageId}`
          : `SMTP attempt failed; delivery may be ambiguous. Review before resending: ${result.error}`;
      }
      await CampaignDelivery.updateOne({ _id: job._id, recipients: { $elemMatch: { claim, state: 'sending' } } },
        { $set: { 'recipients.$.state': state, 'recipients.$.detail': detail } });
    }

    const latest = await CampaignDelivery.findById(job._id);
    if (!latest) continue;
    // Idempotent projection: a restart between saving the outcome and saving its log is safe.
    const finished = latest.recipients.filter(r => !['pending', 'sending'].includes(r.state));
    if (finished.length) await CommunicationLog.bulkWrite(finished.map(r => ({
      updateOne: {
        filter: { _id: r._id },
        update: { $setOnInsert: { campaignId: job._id, customerId: r.customerId,
          business: job.business, userId: job.userId, channel: 'email', status: r.state as 'SENT' | 'FAILED' | 'SKIPPED' | 'UNKNOWN',
          vendorResponse: r.detail ?? undefined, message: personalize(job.body, { name: r.name }) } },
        upsert: true,
      },
    })));
    if (finished.length === latest.recipients.length) {
      const needsReview = finished.some(r => ['UNKNOWN', 'FAILED'].includes(r.state));
      await Campaign.updateOne({ _id: job._id }, { $set: { status: needsReview ? 'needs_review' : 'sent' } });
      const completed = await CampaignDelivery.findOneAndUpdate({ _id: job._id, status: 'queued' },
        { $set: { status: 'completed' } });
      if (completed) {
        const campaign = await Campaign.findById(job._id);
        emitEvent({ event: 'campaign.sent', businessId: String(job.business), entity: 'campaign',
          entityId: String(job._id), doc: { ...campaign?.toObject(), recipientCount: finished.length,
            sentCount: finished.filter(r => r.state === 'SENT').length,
            failedCount: finished.filter(r => ['FAILED', 'UNKNOWN'].includes(r.state)).length,
            skippedCount: finished.filter(r => r.state === 'SKIPPED').length },
          actor: { id: String(job.userId), name: 'Campaign delivery' } });
      }
    }
  }
};

export const startCampaignWorker = () => {
  stopping = false;
  const tick = () => {
    if (active || stopping) return;
    active = processCampaignJobs().catch(error => { logger.error('Campaign worker failed', {
      error: error instanceof Error ? error.message : String(error),
    }); }).finally(() => { active = undefined; });
  };
  timer = setInterval(tick, 1000);
  timer.unref();
  tick();
};

export const stopCampaignWorker = async () => {
  stopping = true;
  clearInterval(timer);
  await active;
};
