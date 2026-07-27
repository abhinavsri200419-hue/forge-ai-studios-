import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger";

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Please try again later.") {
    super(message, 429, "RATE_LIMITED");
  }
}

export class DuplicateSubmissionError extends AppError {
  constructor(message = "We already received this submission a moment ago.") {
    super(message, 409, "DUPLICATE_SUBMISSION");
  }
}

/** Wrap a route handler body; converts any thrown error into a clean JSON response. */
export function handleApiError(route: string, err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: err.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.apiError(route, err);
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
  }

  logger.apiError(route, err);
  return NextResponse.json(
    { error: "Something went wrong. Please try again shortly.", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
