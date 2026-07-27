# Forge AI Studios — Backend

Production backend for the Forge AI Studios agency site, wired up to the
**existing static frontend** (untouched design, layout, and animations).

## What changed on the frontend, exactly

Nothing visual. The original single-file HTML/CSS/JS was split into:

- `public/site.css` — the original `<style>` block, byte-for-byte.
- `public/site.js` — the original `<script>` block, with exactly **two lines**
  changed: the placeholder Formspree URLs became real API routes:
  ```js
  const CONTACT_ENDPOINT = "/api/contact";
  const BOOKING_ENDPOINT  = "/api/book-call";
  ```
  Every other line — the calendar widget, slot logic, carousel, testimonials,
  reveal animations — is identical to your original file.
- `src/app/bodyMarkup.ts` — the original `<body>` markup, extracted verbatim
  as a string and rendered via `dangerouslySetInnerHTML` in `src/app/page.tsx`,
  so the DOM the browser sees is the same DOM your original file produced.

Everything else in this repo is new backend code (API routes, database,
email, calendar, auth).

## Tech stack

Next.js 14 App Router · TypeScript · Prisma · PostgreSQL · Nodemailer ·
Google Calendar API (with Google Meet) · Zod · JWT · bcrypt

## Project structure

```
src/
  app/
    layout.tsx            → head/meta/fonts + site.css link
    page.tsx               → renders original markup + loads site.js
    bodyMarkup.ts           → original <body> HTML, extracted verbatim
    api/
      contact/route.ts             → POST  /api/contact
      book-call/route.ts           → POST  /api/book-call
      admin/
        login/route.ts             → POST  /api/admin/login
        bookings/route.ts          → GET   /api/admin/bookings
        bookings/[id]/route.ts     → GET/PATCH/DELETE /api/admin/bookings/:id
        messages/route.ts          → GET   /api/admin/messages
        messages/[id]/route.ts     → GET/DELETE /api/admin/messages/:id
  lib/
    prisma.ts        → Prisma client singleton
    auth.ts          → JWT signing/verification, bcrypt, requireAdmin()
    google-calendar.ts → event + Meet link creation/deletion
    rate-limit.ts    → DB-backed rate limit + duplicate-submission guard
    errors.ts        → AppError hierarchy + centralized handleApiError()
    logger.ts        → structured JSON logging
  emails/
    mailer.ts        → Nodemailer transport + sendMail()
    templates.ts     → HTML/text templates for all 4 email types
  validators/
    contact.schema.ts
    booking.schema.ts
    admin.schema.ts
  middleware.ts      → CORS + baseline security headers on /api/*
prisma/schema.prisma → Booking, ContactMessage, AdminUser, SubmissionLog
scripts/seed-admin.ts
public/site.css, public/site.js  → original design, unmodified except endpoints
```

> **Note on Helmet:** Helmet is Express middleware and doesn't attach to
> Next.js Route Handlers. The same protections (frame options, content-type
> sniffing, HSTS, referrer policy, permissions policy) are set instead in
> `next.config.js` (`headers()`) and `src/middleware.ts` (CORS + no-sniff),
> which is the idiomatic Next.js equivalent.

## 1. Install

```bash
npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Fill in real values — see the sections below for `DATABASE_URL`, SMTP, and
Google Calendar. Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 3. Database setup

Point `DATABASE_URL` at a running PostgreSQL instance (local, Docker, Neon,
Supabase, RDS — anything Postgres works), then run the migration:

```bash
npx prisma migrate dev --name init
```

This creates the `Booking`, `ContactMessage`, `AdminUser`, and
`SubmissionLog` tables.

Create the first admin login:

```bash
# set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env first
npm run seed:admin
```

## 4. SMTP (email)

Any SMTP provider works (Gmail, SendGrid, Postmark, SES). For Gmail:

1. Enable 2-Step Verification on `marketingwithforge@gmail.com`.
2. Create an [App Password](https://myaccount.google.com/apppasswords).
3. Set:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=marketingwithforge@gmail.com
   SMTP_PASS=<the 16-character app password>
   EMAIL_FROM=marketingwithforge@gmail.com
   ADMIN_EMAIL=marketingwithforge@gmail.com
   ```

## 5. Google Calendar + Meet setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create a
   project and enable the **Google Calendar API**.
2. Under **Credentials**, create an **OAuth Client ID** of type
   *Web application*, with `https://developers.google.com/oauthplayground`
   listed as an authorized redirect URI (only needed to mint the one-time
   refresh token below).
3. Go to the [OAuth Playground](https://developers.google.com/oauthplayground):
   - Click the gear icon → check "Use your own OAuth credentials" → paste
     your Client ID/Secret.
   - In the left panel, select the **Calendar API v3** scope
     `https://www.googleapis.com/auth/calendar`.
   - Authorize, exchange the code for tokens, and copy the **Refresh Token**.
4. Set:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REFRESH_TOKEN=...
   GOOGLE_CALENDAR_ID=primary   # or a specific calendar's ID
   ```

With this configured, flipping a booking's status to **Confirmed** (via
`PATCH /api/admin/bookings/:id`) automatically creates a Calendar event with
a Google Meet link, invites the customer, stores the event ID + Meet link on
the booking, and emails the customer the Meet link. Moving a booking away
from Confirmed deletes the calendar event.

## 6. Run it

```bash
npm run dev       # http://localhost:3000
```

The homepage renders your original design exactly as before. The booking
drawer and contact form now post to real API routes instead of Formspree.

## 7. Admin API usage

```bash
# Log in — returns a JWT and also sets an httpOnly admin_token cookie
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@forgeaistudios.com","password":"your-password"}'

# List bookings (Bearer token or the cookie set above both work)
curl http://localhost:3000/api/admin/bookings \
  -H "Authorization: Bearer <token>"

# Confirm a booking → creates the Calendar event + Meet link + sends invite
curl -X PATCH http://localhost:3000/api/admin/bookings/<id> \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"status":"Confirmed"}'

# List contact messages
curl http://localhost:3000/api/admin/messages -H "Authorization: Bearer <token>"
```

There's no admin dashboard UI in this build — only the API surface the spec
asked for. It's a thin layer to add a `/admin` page on top of these routes
whenever you're ready for one.

## 8. Validation, rate limiting, and duplicate protection

- Every request body is validated with Zod (`src/validators/*`); invalid
  requests return `422` with field-level errors.
- Max **5 submissions per IP every 15 minutes** across contact + booking,
  and no duplicate submission from the same email to the same form within
  **5 minutes** — both enforced via the `SubmissionLog` table so it holds up
  across serverless instances (`src/lib/rate-limit.ts`).
- If the rate-limit check itself fails (e.g. a transient DB blip), the
  request is allowed through and the failure is logged — infrastructure
  hiccups should never silently drop a real lead.

## 9. Deployment

1. Push to GitHub.
2. Deploy to Vercel (or any Node host). Set every variable from
   `.env.example` in the platform's environment settings.
3. Point `DATABASE_URL` at your production Postgres (Neon/Supabase/RDS).
4. Run the migration against production once:
   ```bash
   npx prisma migrate deploy
   ```
5. Seed the admin user in production the same way as step 3.
6. Set `ALLOWED_ORIGIN` to your real domain (e.g. `https://forgeaistudios.com`)
   instead of `*`.

## Commands reference

```bash
npm run dev              # local dev server
npm run build            # prisma generate + next build
npm run start            # start production build
npm run prisma:migrate   # create/apply a new migration (dev)
npm run prisma:deploy    # apply pending migrations (prod)
npm run prisma:studio    # visual DB browser
npm run seed:admin       # create/update the admin login
```
