/**
 * Minimal structured logger. Swap the console calls for a provider
 * (Sentry, Axiom, Datadog, etc.) by editing only this file.
 */
type LogMeta = Record<string, unknown>;

function base(level: string, scope: string, message: string, meta?: LogMeta) {
  const entry = {
    level,
    scope,
    message,
    time: new Date().toISOString(),
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (scope: string, message: string, meta?: LogMeta) => base("info", scope, message, meta),
  warn: (scope: string, message: string, meta?: LogMeta) => base("warn", scope, message, meta),
  error: (scope: string, message: string, meta?: LogMeta) => base("error", scope, message, meta),

  apiError: (route: string, err: unknown, meta?: LogMeta) =>
    base("error", "api", `${route} failed`, {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      ...meta,
    }),
  emailError: (context: string, err: unknown, meta?: LogMeta) =>
    base("error", "email", `${context} failed`, {
      error: err instanceof Error ? err.message : String(err),
      ...meta,
    }),
  calendarError: (context: string, err: unknown, meta?: LogMeta) =>
    base("error", "calendar", `${context} failed`, {
      error: err instanceof Error ? err.message : String(err),
      ...meta,
    }),
  dbError: (context: string, err: unknown, meta?: LogMeta) =>
    base("error", "database", `${context} failed`, {
      error: err instanceof Error ? err.message : String(err),
      ...meta,
    }),
};
