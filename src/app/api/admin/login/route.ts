import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminLoginSchema } from "@/validators/admin.schema";
import { verifyPassword, signAdminToken } from "@/lib/auth";
import { handleApiError, UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { email, password } = adminLoginSchema.parse(json);

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin) throw new UnauthorizedError("Invalid email or password");

    const valid = await verifyPassword(password, admin.password);
    if (!valid) {
      logger.warn("admin-login", "Failed login attempt", { email });
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = signAdminToken({ sub: admin.id, email: admin.email, role: admin.role });

    const res = NextResponse.json({
      ok: true,
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });

    // Also set as an httpOnly cookie so the admin panel can rely on cookie auth
    // instead of manually attaching the Authorization header everywhere.
    res.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch (err) {
    return handleApiError("POST /api/admin/login", err);
  }
}
