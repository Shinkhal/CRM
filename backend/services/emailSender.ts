import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  // Port 465 is implicit TLS. The transport used to force `secure: false`,
  // so a TLS-only server could not be used at all.
  secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 60000,
  debug: env.NODE_ENV === 'development',
});

export const sendEmail = async (
  toEmail: string,
  subject: string,
  content: string,
  isHtml: boolean = false,
  headers: Record<string, string> = {}
): Promise<EmailResult> => {
  const mailOptions = {
    from: env.SMTP_FROM || env.SMTP_USER,
    to: toEmail,
    subject,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    ...(isHtml ? { html: content } : { text: content }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error';
    logger.error('Error sending email', { error: message, toEmail, subject, service: 'emailSender' });
    return { success: false, error: message };
  }
};

export default { sendEmail };
