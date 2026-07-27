import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
