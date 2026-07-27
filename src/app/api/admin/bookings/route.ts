import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const bookings = await prisma.booking.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, bookings });
  } catch (err) {
    return handleApiError("GET /api/admin/bookings", err);
  }
}
