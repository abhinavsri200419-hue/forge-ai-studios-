import { google } from "googleapis";
import crypto from "crypto";
import { logger } from "./logger";

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Calendar is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN."
    );
  }

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return oAuth2Client;
}

export interface CreateEventInput {
  summary: string;
  description: string;
  startISO: string; // e.g. 2026-08-04T10:00:00
  endISO: string;
  attendeeEmail: string;
  attendeeName: string;
  timeZone?: string;
}

export interface CreateEventResult {
  eventId: string;
  meetLink: string | null;
  htmlLink: string | null;
}

/**
 * Creates a Google Calendar event with a Google Meet conference attached
 * and invites the customer. Used when an admin flips a booking to "Confirmed".
 */
export async function createCalendarEventWithMeet(
  input: CreateEventInput
): Promise<CreateEventResult> {
  const auth = getOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const timeZone = input.timeZone || "Asia/Kolkata";

  try {
    const response = await calendar.events.insert({
      calendarId,
      sendUpdates: "all",
      conferenceDataVersion: 1,
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.startISO, timeZone },
        end: { dateTime: input.endISO, timeZone },
        attendees: [{ email: input.attendeeEmail, displayName: input.attendeeName }],
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 30 },
          ],
        },
      },
    });

    const event = response.data;
    const meetLink =
      event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? null;

    if (!event.id) throw new Error("Google Calendar returned no event id");

    return { eventId: event.id, meetLink, htmlLink: event.htmlLink ?? null };
  } catch (err) {
    logger.calendarError("createCalendarEventWithMeet", err, { attendeeEmail: input.attendeeEmail });
    throw err;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const auth = getOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  try {
    await calendar.events.delete({ calendarId, eventId, sendUpdates: "all" });
  } catch (err) {
    logger.calendarError("deleteCalendarEvent", err, { eventId });
    throw err;
  }
}

/** Combines a "YYYY-MM-DD" date with a "10:00 AM" style slot label into ISO start/end strings. */
export function buildEventWindow(
  preferredDateISO: string,
  preferredTime: string,
  durationMinutes = 30
): { startISO: string; endISO: string } {
  const timeMatch = preferredTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!timeMatch) throw new Error(`Unrecognized time slot format: "${preferredTime}"`);

  let [, hourStr, minuteStr, ampm] = timeMatch;
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  if (ampm.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;

  const start = new Date(`${preferredDateISO}T00:00:00`);
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const toLocalISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}:00`;

  return { startISO: toLocalISO(start), endISO: toLocalISO(end) };
}
