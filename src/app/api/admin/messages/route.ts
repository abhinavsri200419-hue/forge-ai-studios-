import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ ok: true, messages });
  } catch (err) {
    return handleApiError("GET /api/admin/messages", err);
  }
}
