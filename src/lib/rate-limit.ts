import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { RateLimitError, DuplicateSubmissionError } from "./errors";
import { logger } from "./logger";

const RATE_LIMIT_MAX = 5; // submissions
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

/**
 * Enforces:
 *  - max 5 submissions per IP per 15 minutes (across contact + booking)
 *  - no duplicate submission from the same email for the same form within 5 minutes
 * Persisted in Postgres (SubmissionLog) so it holds up across serverless instances.
 * On any DB failure this fails OPEN (logs + allows the request through) so a
 * database hiccup never blocks a genuine lead from being captured.
 */
export async function enforceSubmissionLimits(
  req: NextRequest,
  email: string,
  kind: "contact" | "booking"
): Promise<void> {
  const ip = getClientIp(req);
  const emailHash = hashEmail(email);
  const now = new Date();

  try {
    const [ipCount, duplicate] = await Promise.all([
      prisma.submissionLog.count({
        where: { ip, createdAt: { gte: new Date(now.getTime() - RATE_LIMIT_WINDOW_MS) } },
      }),
      prisma.submissionLog.findFirst({
        where: {
          emailHash,
          kind,
          createdAt: { gte: new Date(now.getTime() - DUPLICATE_WINDOW_MS) },
        },
      }),
    ]);

    if (ipCount >= RATE_LIMIT_MAX) {
      throw new RateLimitError();
    }
    if (duplicate) {
      throw new DuplicateSubmissionError();
    }

    await prisma.submissionLog.create({ data: { ip, emailHash, kind } });
  } catch (err) {
    if (err instanceof RateLimitError || err instanceof DuplicateSubmissionError) throw err;
    logger.dbError("enforceSubmissionLimits", err, { ip, kind });
    // fail open — don't let infra issues drop a real lead
  }
}
