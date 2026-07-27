function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(bodyHtml: string): string {
  return `
  <div style="background:#0a0806;padding:32px 16px;font-family:'Space Grotesk',Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#171009;border:1px solid rgba(245,235,220,0.09);border-radius:18px;overflow:hidden;">
      <div style="padding:24px 28px;border-bottom:1px solid rgba(245,235,220,0.09);">
        <span style="color:#ffb15c;font-weight:600;font-size:18px;letter-spacing:0.02em;">Forge AI Studios</span>
        <div style="color:#a89f90;font-size:12px;margin-top:2px;">Forging Intelligent Digital Experiences</div>
      </div>
      <div style="padding:28px;color:#f4eee3;font-size:14px;line-height:1.6;">
        ${bodyHtml}
      </div>
      <div style="padding:16px 28px;border-top:1px solid rgba(245,235,220,0.09);color:#6b6459;font-size:12px;">
        Forge AI Studios · marketingwithforge@gmail.com
      </div>
    </div>
  </div>`;
}

function row(label: string, value?: string | null): string {
  if (!value) return "";
  return `<tr>
    <td style="padding:6px 0;color:#a89f90;width:150px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:6px 0;color:#f4eee3;">${escapeHtml(value)}</td>
  </tr>`;
}

export interface BookingEmailData {
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  service?: string | null;
  preferredDateLabel: string;
  preferredTime: string;
  message?: string | null;
}

export function internalBookingEmail(data: BookingEmailData) {
  const html = shell(`
    <h2 style="margin:0 0 16px;color:#ffb15c;font-size:18px;">New Booking Received</h2>
    <table style="width:100%;border-collapse:collapse;">
      ${row("Name", data.name)}
      ${row("Company", data.company)}
      ${row("Email", data.email)}
      ${row("Phone", data.phone)}
      ${row("Selected Service", data.service)}
      ${row("Preferred Date", data.preferredDateLabel)}
      ${row("Preferred Time", data.preferredTime)}
      ${row("Message", data.message)}
      ${row("Timestamp", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))}
    </table>
  `);
  const text = [
    "New Booking Received",
    `Name: ${data.name}`,
    data.company ? `Company: ${data.company}` : null,
    `Email: ${data.email}`,
    data.phone ? `Phone: ${data.phone}` : null,
    data.service ? `Selected Service: ${data.service}` : null,
    `Preferred Date: ${data.preferredDateLabel}`,
    `Preferred Time: ${data.preferredTime}`,
    data.message ? `Message: ${data.message}` : null,
    `Timestamp: ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: "New Discovery Call Booking", html, text };
}

export function customerBookingConfirmationEmail(data: BookingEmailData) {
  const html = shell(`
    <p>Hi ${escapeHtml(data.name)},</p>
    <p>Thank you for booking a discovery call with Forge AI Studios. We have received your request.</p>
    <h3 style="color:#ffb15c;font-size:14px;margin:20px 0 8px;">Booking Details</h3>
    <table style="width:100%;border-collapse:collapse;">
      ${row("Company", data.company)}
      ${row("Service", data.service)}
      ${row("Preferred Date", data.preferredDateLabel)}
      ${row("Preferred Time", data.preferredTime)}
    </table>
    <p style="margin-top:20px;">One of our team members will review the request and send you the meeting invite shortly.</p>
    <p style="margin-top:20px;">Regards,<br/>Forge AI Studios</p>
  `);
  const text = [
    `Hi ${data.name},`,
    "",
    "Thank you for booking a discovery call with Forge AI Studios. We have received your request.",
    "",
    "Booking Details",
    data.company ? `Company: ${data.company}` : null,
    data.service ? `Service: ${data.service}` : null,
    `Preferred Date: ${data.preferredDateLabel}`,
    `Preferred Time: ${data.preferredTime}`,
    "",
    "One of our team members will review the request and send you the meeting invite shortly.",
    "",
    "Regards,",
    "Forge AI Studios",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: "Discovery Call Confirmed", html, text };
}

export interface BookingConfirmedEmailData extends BookingEmailData {
  meetLink: string;
}

export function customerBookingCalendarInviteEmail(data: BookingConfirmedEmailData) {
  const html = shell(`
    <p>Hi ${escapeHtml(data.name)},</p>
    <p>Your discovery call with Forge AI Studios is confirmed. A calendar invite has been sent to this email address.</p>
    <table style="width:100%;border-collapse:collapse;">
      ${row("Preferred Date", data.preferredDateLabel)}
      ${row("Preferred Time", data.preferredTime)}
    </table>
    <p style="margin-top:20px;">
      <a href="${data.meetLink}" style="display:inline-block;background:#ff7a1f;color:#0a0806;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600;">Join Google Meet</a>
    </p>
    <p style="margin-top:20px;">Regards,<br/>Forge AI Studios</p>
  `);
  const text = `Hi ${data.name},\n\nYour discovery call with Forge AI Studios is confirmed for ${data.preferredDateLabel} at ${data.preferredTime}.\nJoin via Google Meet: ${data.meetLink}\n\nRegards,\nForge AI Studios`;

  return { subject: "Your Discovery Call is Confirmed — Meet Link Inside", html, text };
}

export interface ContactEmailData {
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  service?: string | null;
  message: string;
}

export function internalContactEmail(data: ContactEmailData) {
  const html = shell(`
    <h2 style="margin:0 0 16px;color:#ffb15c;font-size:18px;">New Contact Form Submission</h2>
    <table style="width:100%;border-collapse:collapse;">
      ${row("Name", data.name)}
      ${row("Company", data.company)}
      ${row("Email", data.email)}
      ${row("Phone", data.phone)}
      ${row("Selected Service", data.service)}
      ${row("Timestamp", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))}
    </table>
    <h3 style="color:#ffb15c;font-size:14px;margin:20px 0 8px;">Message</h3>
    <p style="white-space:pre-wrap;">${escapeHtml(data.message)}</p>
  `);
  const text = [
    "New Contact Form Submission",
    `Name: ${data.name}`,
    data.company ? `Company: ${data.company}` : null,
    `Email: ${data.email}`,
    data.phone ? `Phone: ${data.phone}` : null,
    data.service ? `Selected Service: ${data.service}` : null,
    `Timestamp: ${new Date().toISOString()}`,
    "",
    "Message:",
    data.message,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: "New enquiry from forgeaistudios.com", html, text };
}

export function customerContactConfirmationEmail(data: ContactEmailData) {
  const html = shell(`
    <p>Hi ${escapeHtml(data.name)},</p>
    <p>Thanks for reaching out to Forge AI Studios. We've received your message and will get back to you within one business day.</p>
    <h3 style="color:#ffb15c;font-size:14px;margin:20px 0 8px;">What you sent us</h3>
    <p style="white-space:pre-wrap;color:#cdd3d8;">${escapeHtml(data.message)}</p>
    <p style="margin-top:20px;">Regards,<br/>Forge AI Studios</p>
  `);
  const text = `Hi ${data.name},\n\nThanks for reaching out to Forge AI Studios. We've received your message and will get back to you within one business day.\n\nWhat you sent us:\n${data.message}\n\nRegards,\nForge AI Studios`;

  return { subject: "We've received your message — Forge AI Studios", html, text };
}
