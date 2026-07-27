import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

export function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    applyCors(res);
    return res;
  }

  const res = NextResponse.next();
  applyCors(res);
  return res;
}

function applyCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("X-Content-Type-Options", "nosniff");
}

export const config = {
  matcher: "/api/:path*",
};
