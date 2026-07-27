import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { UnauthorizedError } from "./errors";

const JWT_SECRET = process.env.JWT_SECRET as string;
const TOKEN_TTL = "12h";
const SALT_ROUNDS = 12;

if (!JWT_SECRET) {
  // Fail loudly at boot rather than silently signing tokens with `undefined`.
  // eslint-disable-next-line no-console
  console.warn("[auth] JWT_SECRET is not set — admin auth will not work until it is.");
}

export interface AdminTokenPayload {
  sub: string; // admin user id
  email: string;
  role: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired session. Please log in again.");
  }
}

/** Extracts + verifies the admin JWT from the Authorization header (Bearer) or an admin_token cookie. */
export function requireAdmin(req: NextRequest): AdminTokenPayload {
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const cookieToken = req.cookies.get("admin_token")?.value ?? null;

  const token = bearerToken || cookieToken;
  if (!token) throw new UnauthorizedError("Admin authentication required.");

  return verifyAdminToken(token);
}
