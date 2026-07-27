import { z } from "zod";

const phoneRegex = /^[+]?[\d\s()-]{7,20}$/;
const TIME_SLOT_REGEX = /^(1[0-2]|0?[1-9]):[0-5]\d\s?(AM|PM)$/i;
const MAX_BOOKING_DAYS_AHEAD = 60;

export const bookingSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
    company: z.string().trim().max(150).optional().or(z.literal("")),
    email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
    phone: z
      .string()
      .trim()
      .max(30)
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || phoneRegex.test(v), "Enter a valid phone number"),
    service: z.string().trim().max(150).optional().or(z.literal("")),
    message: z.string().trim().max(4000).optional().or(z.literal("")),
    // sent by the existing calendar widget as "requested_date" / "requested_time"
    requested_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Preferred date must be in YYYY-MM-DD format"),
    requested_time: z.string().regex(TIME_SLOT_REGEX, "Preferred time must look like '10:00 AM'"),
  })
  .superRefine((data, ctx) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requested = new Date(`${data.requested_date}T00:00:00`);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + MAX_BOOKING_DAYS_AHEAD);

    if (requested < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requested_date"],
        message: "Preferred date cannot be in the past",
      });
    }
    if (requested > maxDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requested_date"],
        message: `Preferred date must be within ${MAX_BOOKING_DAYS_AHEAD} days`,
      });
    }
  });

export type BookingInput = z.infer<typeof bookingSchema>;

export const bookingStatusUpdateSchema = z.object({
  status: z.enum(["Pending", "Confirmed", "Completed", "Cancelled"]),
});
