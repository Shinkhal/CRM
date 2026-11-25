import { env } from '../config/env.js';
import { buildUnsubscribeToken } from '../utils/unsubscribeToken.js';

export interface CampaignRecipient {
  _id: unknown;
  name: string;
  email: string;
  totalSpend?: number;
  totalOrders?: number;
  lastOrderDate?: Date;
}

export interface RenderCampaignEmailInput {
  businessId: string;
  companyName: string;
  subject: string;
  body: string;
  recipient: CampaignRecipient;
}

/**
 * Replaces `{{token}}` placeholders with recipient specific values. Unknown
 * placeholders are left untouched so a typo is visible in preview instead of
 * silently disappearing from a live campaign.
 */
export const personalize = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key: string) => {
    const value = values[key];
    if (value === undefined || value === null) return match;
    return String(value);
  });

export const buildUnsubscribeUrl = (businessId: string, email: string): string => {
  const token = buildUnsubscribeToken(businessId, email);
  const base = env.SERVER_URL || env.CLIENT_URL || '';
  const url = new URL('/api/unsubscribe', base || 'http://localhost:5000');
  // The tenant is carried in the link. Without it the receiver had to scan
  // every tenant and compute one HMAC per tenant to find the match, which is
  // an unauthenticated O(N) denial of service.
  url.searchParams.set('business', businessId);
  url.searchParams.set('email', email.trim().toLowerCase());
  url.searchParams.set('token', token);
  return url.toString();
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Renders a campaign email. Inline styles are used on purpose: most mail
 * clients strip `<style>` blocks and class based styling.
 */
export const renderCampaignEmail = ({
  businessId,
  companyName,
  subject,
  body,
  recipient,
}: RenderCampaignEmailInput): string => {
  const unsubscribeUrl = buildUnsubscribeUrl(businessId, recipient.email);

  const values: Record<string, string | number> = {
    name: recipient.name,
    firstName: (recipient.name || '').trim().split(/\s+/)[0] || recipient.name,
    email: recipient.email,
    totalSpend: Number(recipient.totalSpend || 0).toLocaleString(),
    totalOrders: Number(recipient.totalOrders || 0),
    company: companyName,
    unsubscribeUrl,
    subject,
  };

  const renderedBody = personalize(body, values)
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 16px;">${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:#0f172a;padding:28px 32px;">
              <h1 style="margin:0;font-size:20px;line-height:1.3;color:#ffffff;">${escapeHtml(companyName)}</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">${escapeHtml(subject)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;font-size:15px;line-height:1.7;">
              <p style="margin:0 0 20px;font-weight:600;">Hello ${escapeHtml(recipient.name)},</p>
              ${renderedBody}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.6;">
              <p style="margin:0 0 8px;">You are receiving this because you are a contact of ${escapeHtml(companyName)}.</p>
              <p style="margin:0;">
                <a href="${escapeHtml(unsubscribeUrl)}" style="color:#2563eb;text-decoration:underline;">Unsubscribe</a>
                &nbsp;&middot;&nbsp;
                <a href="${escapeHtml(unsubscribeUrl)}" style="color:#2563eb;text-decoration:underline;">Update preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export default { renderCampaignEmail, personalize, buildUnsubscribeUrl };
