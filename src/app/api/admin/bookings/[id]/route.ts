import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { bookingStatusUpdateSchema } from "@/validators/booking.schema";
import { buildEventWindow, createCalendarEventWithMeet, deleteCalendarEvent } from "@/lib/google-calendar";
import { sendMail } from "@/emails/mailer";
import { customerBookingCalendarInviteEmail } from "@/emails/templates";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    requireAdmin(req);
    const booking = await prisma.booking.findUnique({ where: { id: params.id } });
    if (!booking) throw new NotFoundError("Booking not found");
    return NextResponse.json({ ok: true, booking });
  } catch (err) {
    return handleApiError("GET /api/admin/bookings/[id]", err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    requireAdmin(req);
    const json = await req.json();
    const { status } = bookingStatusUpdateSchema.parse(json);

    const existing = await prisma.booking.findUnique({ where: { id: params.id } });
    if (!existing) throw new NotFoundError("Booking not found");

    const isNewlyConfirmed = status === "Confirmed" && existing.status !== "Confirmed";

    // Default update — just the status, unless we're newly confirming and
    // successfully create a calendar event below (in which case we also
    // attach the event id / meet link).
    let updateData: Record<string, unknown> = { status };

    if (isNewlyConfirmed) {
      try {
        const preferredDateISO = existing.preferredDate.toISOString().slice(0, 10);
        const { startISO, endISO } = buildEventWindow(preferredDateISO, existing.preferredTime);

        const event = await createCalendarEventWithMeet({
          summary: `Discovery Call — ${existing.name}${existing.company ? ` (${existing.company})` : ""}`,
          description: [
            `Service: ${existing.service || "Not specified"}`,
            existing.message ? `Notes: ${existing.message}` : null,
            "Booked via forgeaistudios.com",
          ]
            .filter(Boolean)
            .join("\n"),
          startISO,
          endISO,
          attendeeEmail: existing.email,
          attendeeName: existing.name,
        });

        updateData = {
          status,
          googleEventId: event.eventId,
          meetLink: event.meetLink,
        };

        if (event.meetLink) {
          const dateLabel = existing.preferredDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          const invite = customerBookingCalendarInviteEmail({
            name: existing.name,
            company: existing.company,
            email: existing.email,
            phone: existing.phone,
            service: existing.service,
            preferredDateLabel: dateLabel,
            preferredTime: existing.preferredTime,
            message: existing.message,
            meetLink: event.meetLink,
          });
          const sent = await sendMail({
            to: existing.email,
            subject: invite.subject,
            html: invite.html,
            text: invite.text,
          });
          if (!sent) logger.warn("booking-confirm", "Meet invite email failed to send", { bookingId: existing.id });
        }
      } catch (calendarErr) {
        // Calendar/email failure should not block the admin from marking the
        // booking Confirmed — status still updates, just without the event.
        logger.calendarError("PATCH /api/admin/bookings/[id]", calendarErr, { bookingId: existing.id });
      }
    }

    // If moving OUT of Confirmed (e.g. to Cancelled) and a calendar event exists, clean it up.
    if (existing.status === "Confirmed" && status !== "Confirmed" && existing.googleEventId) {
      try {
        await deleteCalendarEvent(existing.googleEventId);
        updateData.googleEventId = null;
        updateData.meetLink = null;
      } catch (calendarErr) {
        logger.calendarError("PATCH /api/admin/bookings/[id] (cleanup)", calendarErr, {
          bookingId: existing.id,
        });
      }
    }

    const updated = await prisma.booking.update({ where: { id: params.id }, data: updateData });
    return NextResponse.json({ ok: true, booking: updated });
  } catch (err) {
    return handleApiError("PATCH /api/admin/bookings/[id]", err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    requireAdmin(req);
    const existing = await prisma.booking.findUnique({ where: { id: params.id } });
    if (!existing) throw new NotFoundError("Booking not found");

    if (existing.googleEventId) {
      try {
        await deleteCalendarEvent(existing.googleEventId);
      } catch (calendarErr) {
        logger.calendarError("DELETE /api/admin/bookings/[id]", calendarErr, { bookingId: existing.id });
      }
    }

    await prisma.booking.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError("DELETE /api/admin/bookings/[id]", err);
  }
}
