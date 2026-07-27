import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleApiError, NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    requireAdmin(req);
    const message = await prisma.contactMessage.findUnique({ where: { id: params.id } });
    if (!message) throw new NotFoundError("Message not found");
    return NextResponse.json({ ok: true, message });
  } catch (err) {
    return handleApiError("GET /api/admin/messages/[id]", err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    requireAdmin(req);
    const existing = await prisma.contactMessage.findUnique({ where: { id: params.id } });
    if (!existing) throw new NotFoundError("Message not found");
    await prisma.contactMessage.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError("DELETE /api/admin/messages/[id]", err);
  }
}
