import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingSchema } from "@/validators/booking.schema";
import { enforceSubmissionLimits } from "@/lib/rate-limit";
import { handleApiError } from "@/lib/errors";
import { sendMail } from "@/emails/mailer";
import { internalBookingEmail, customerBookingConfirmationEmail } from "@/emails/templates";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function formatDateLabel(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const data = bookingSchema.parse(json);

    await enforceSubmissionLimits(req, data.email, "booking");

    const saved = await prisma.booking.create({
      data: {
        name: data.name,
        company: data.company || null,
        email: data.email,
        phone: data.phone || null,
        service: data.service || null,
        preferredDate: new Date(`${data.requested_date}T00:00:00`),
        preferredTime: data.requested_time,
        message: data.message || null,
        status: "Pending",
      },
    });

    const adminEmail = process.env.ADMIN_EMAIL || "marketingwithforge@gmail.com";
    const preferredDateLabel = formatDateLabel(data.requested_date);

    const emailPayload = {
      name: data.name,
      company: data.company,
      email: data.email,
      phone: data.phone,
      service: data.service,
      preferredDateLabel,
      preferredTime: data.requested_time,
      message: data.message,
    };

    const internal = internalBookingEmail(emailPayload);
    const customer = customerBookingConfirmationEmail(emailPayload);

    const [adminSent, customerSent] = await Promise.all([
      sendMail({ to: adminEmail, subject: internal.subject, html: internal.html, text: internal.text }),
      sendMail({ to: data.email, subject: customer.subject, html: customer.html, text: customer.text }),
    ]);

    if (!adminSent || !customerSent) {
      logger.warn("booking", "One or more booking emails failed to send", {
        bookingId: saved.id,
        adminSent,
        customerSent,
      });
    }

    return NextResponse.json({ ok: true, id: saved.id, status: saved.status }, { status: 201 });
  } catch (err) {
    return handleApiError("POST /api/book-call", err);
  }
}
