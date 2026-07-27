import nodemailer, { Transporter } from "nodemailer";
import { logger } from "../lib/logger";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS.");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends an email. Failures are logged but NEVER thrown to the caller —
 * a broken SMTP connection must never lose a lead that's already saved
 * in the database. Callers can inspect the returned boolean if they want
 * to surface a soft warning.
 */
export async function sendMail(input: SendMailInput): Promise<boolean> {
  try {
    const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const t = getTransporter();
    await t.sendMail({
      from: `"Forge AI Studios" <${from}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return true;
  } catch (err) {
    logger.emailError("sendMail", err, { to: input.to, subject: input.subject });
    return false;
  }
}
