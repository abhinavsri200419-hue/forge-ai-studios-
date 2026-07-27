import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/validators/contact.schema";
import { enforceSubmissionLimits } from "@/lib/rate-limit";
import { handleApiError } from "@/lib/errors";
import { sendMail } from "@/emails/mailer";
import { internalContactEmail, customerContactConfirmationEmail } from "@/emails/templates";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const data = contactSchema.parse(json);

    await enforceSubmissionLimits(req, data.email, "contact");

    const saved = await prisma.contactMessage.create({
      data: {
        name: data.name,
        company: data.company || null,
        email: data.email,
        phone: data.phone || null,
        service: data.service || null,
        message: data.message,
      },
    });

    const adminEmail = process.env.ADMIN_EMAIL || "marketingwithforge@gmail.com";
    const internal = internalContactEmail(data);
    const customer = customerContactConfirmationEmail(data);

    // Fire both emails; neither failure should roll back the saved record —
    // the lead is already safe in Postgres regardless of email delivery.
    const [adminSent, customerSent] = await Promise.all([
      sendMail({ to: adminEmail, subject: internal.subject, html: internal.html, text: internal.text }),
      sendMail({ to: data.email, subject: customer.subject, html: customer.html, text: customer.text }),
    ]);

    if (!adminSent || !customerSent) {
      logger.warn("contact", "One or more contact emails failed to send", {
        contactMessageId: saved.id,
        adminSent,
        customerSent,
      });
    }

    return NextResponse.json({ ok: true, id: saved.id }, { status: 201 });
  } catch (err) {
    return handleApiError("POST /api/contact", err);
  }
}
