import { z } from "zod";

// Loose but real E.164-ish check — accepts "+91 98765 43210", "9876543210", etc.
const phoneRegex = /^[+]?[\d\s()-]{7,20}$/;

export const contactSchema = z.object({
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
  message: z.string().trim().min(3, "Message cannot be empty").max(4000),
});

export type ContactInput = z.infer<typeof contactSchema>;
