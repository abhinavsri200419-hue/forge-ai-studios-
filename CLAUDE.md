# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Production backend for the Forge AI Studios agency site. The frontend is a **pre-existing static design that must not be visually changed** — the original single-file HTML/CSS/JS was split into `public/site.css` (verbatim), `public/site.js` (verbatim except two endpoint constants), and `src/app/bodyMarkup.ts` (the original `<body>` HTML as a string). The homepage renders that string via `dangerouslySetInnerHTML`. Everything else is new backend code: Next.js 14 App Router API routes, Prisma/Postgres, Nodemailer, Google Calendar + Meet, JWT auth.

**Golden rule:** do not touch the markup, styling, or layout in `bodyMarkup.ts`, `site.css`, or the visual logic in `site.js`. The only wiring in the frontend is that `site.js` posts to `/api/contact` and `/api/book-call`.

## Commands

```bash
npm install            # install deps
npm run dev            # local dev server (http://localhost:3000)
npm run build          # prisma generate + next build
npm run start          # run a production build
npm run lint           # next lint
npm run prisma:migrate # create/apply a dev migration (npx prisma migrate dev)
npm run prisma:deploy  # apply pending migrations in prod (npx prisma migrate deploy)
npm run prisma:studio  # visual DB browser
npm run seed:admin     # create/update the admin login (tsx scripts/seed-admin.ts)
```

Setup: copy `.env.example` → `.env`, point `DATABASE_URL` at Postgres, run `npm run prisma:migrate -- --name init`, then `npm run seed:admin`. There are **no tests** in this repo.

## Architecture

### API surface
- **Public (no auth):** `POST /api/contact`, `POST /api/book-call`.
- **Admin (auth required):** `POST /api/admin/login`; `GET`/`PATCH`/`DELETE` on `/api/admin/bookings[/:id]`; `GET`/`DELETE` on `/api/admin/messages[/:id]`. There is no admin dashboard UI — only the API. Use `requireAdmin(req)` (Bearer token or the httpOnly `admin_token` cookie set at login).

### The standard route pattern
Every route handler follows the same shape: `try { parse body → Zod schema; enforce limits; persist; send emails } catch (err) { return handleApiError("METHOD /path", err) }`. Errors are centralized in `src/lib/errors.ts` — `AppError` subclasses carry status + machine-readable `code`; `handleApiError()` maps `ZodError`→422, `AppError`→its status, everything else→500. Always throw domain errors (e.g. `NotFoundError`) and let `handleApiError` respond.

### Data flow for public submissions
1. Zod-validate the body (`src/validators/*.schema.ts`).
2. `enforceSubmissionLimits()` (`src/lib/rate-limit.ts`) — 5 submissions/IP/15min and no duplicate same-email/same-form within 5min, persisted in the `SubmissionLog` table so it holds across serverless cold starts. **Fails open**: a DB error logs and lets the request through rather than dropping a lead.
3. Persist to Postgres (`Booking` or `ContactMessage`).
4. Fire internal + customer emails via Nodemailer. **Emails never throw** — `sendMail()` returns a boolean and logs on failure; the lead is already safe in the DB regardless.

### Booking lifecycle (admin)
`PATCH /api/admin/bookings/:id` with status `Confirmed` creates a Google Calendar event with a Meet link (`src/lib/google-calendar.ts`), stores the event id/Meet link on the booking, and emails the customer. Moving off `Confirmed` (or deleting) removes the calendar event. **Calendar/email failures never block the status update** — the status still changes, just without the event (wrapped in try/catch, logged).

### Cross-cutting conventions
- **Path alias:** `@/*` maps to `src/*` (see `tsconfig.json`). Import with `@/lib/...`, `@/validators/...`, `@/emails/...`.
- **Auth** (`src/lib/auth.ts`): bcrypt (12 rounds), JWT 12h TTL. `requireAdmin()` accepts a `Bearer` token or the `admin_token` cookie.
- **Prisma client** (`src/lib/prisma.ts`): singleton cached on `globalThis` to avoid exhausting connections under dev hot-reload. Import the shared instance — don't `new PrismaClient()` per request.
- **Runtime:** every route sets `export const runtime = "nodejs"` (needed for bcrypt/nodemailer/googleapis).
- **Logging** (`src/lib/logger.ts`): structured JSON console logging with scopes. `logger.apiError` / `emailError` / `calendarError` / `dbError` helpers exist — swap console for a provider here only.
- **Security:** security headers are set in `next.config.js` (`headers()`) and `src/middleware.ts` (CORS + no-sniff on `/api/*`). Note: **Helmet is not used** — it's Express middleware and doesn't attach to Next.js Route Handlers; the idiomatic equivalents in `next.config.js`/`middleware.ts` cover the same protections.
- **Env:** all config comes from `process.env` (see `.env.example`). `ALLOWED_ORIGIN` controls CORS; `JWT_SECRET` guards admin auth; SMTP/Google vars configure email + calendar.

### Key design intent to preserve
Lead capture is resilient by design: database persistence is the source of truth, and downstream side effects (email delivery, calendar/Meet creation) are best-effort and fail-open. When modifying these routes, keep the pattern that a transient email/calendar/DB failure never silently drops or blocks a genuine lead — persist first, log secondary failures, surface via the returned boolean/status.
