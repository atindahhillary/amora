# Amora

Curated, ID-verified, intention-first matchmaking for Nairobi. This is the **Season 1 MVP**: a web app installable from the browser, built to test one question:

> Will verified, intentional adults pay for fewer matches and go on real dates?

## What's built

**Members** (`/app`)
- Application with a 25 to 55 age gate (one constant in `src/lib/config.ts`), and explicit consent for sensitive data under the Kenya Data Protection Act
- Phone OTP sign-in (hashed codes, expiry, attempt limits and hourly limits)
- KES 300 application fee by M-Pesa STK push, charged **before** the ID check so bots can't use up the verification budget
- Identity check. Only the outcome and an HMAC of the ID number are stored, so duplicate accounts are blocked and no ID images are kept
- 25-question values and intent questionnaire with self-declared dealbreakers. Ethnicity and tribe are never asked or inferred
- 30-second voice intro (recorded in the browser or uploaded)
- Profile drafted by Claude from the answers, then edited and approved by the member
- KES 2,500 monthly membership, paid by M-Pesa each month with a renewal reminder by SMS (no auto-debit). A member who leaves because they met someone gets a free month to give a friend
- Up to 3 matches a month, released on Thursdays. A match the other person passes on doesn't count against your 3 (`REPLACE_PASSED_MATCHES` in `src/lib/config.ts`). Each arrives as a match card with three compatibility pillars and a "Why this match" note approved by the matchmaker. Options are Accept, Pass or Decide later
- Staged conversation in a 7-day window: swap voice intros, then three guided prompts (you see their answer after you share yours), then free chat
- One-tap respectful close, which never counts against you. A safety close blocks, reports, and routes the case to a person
- Date bridge: partner venues, the date plan texted to a trusted contact, an "I'm okay" / "I need help" check-in, and no-show reporting
- **Gifts:** flowers, chocolates or a handwritten card, sent only to someone you're already talking to. The recipient accepts and gives a delivery location that the sender never sees; declining refunds the sender. A matchmaker queue handles fulfilment with a partner florist, and delivery details are deleted once delivered
- **Vetting questions:** 25 open-ended questions in six sections (intent and readiness, communication, values, children and family, shared experience, marriage), saved as you go. Only matchmakers read them, at application review and pair review; they are never shown to matches
- Private, explainable **Standing** panel. Every event is listed, and penalties show as "under review" until a person applies them
- Data export (JSON) and account deletion

**Matchmakers** (`/admin`, for phones in `ADMIN_PHONES`)
- Density dashboard by gender. Matching can only be opened once both sides reach a minimum
- Application review (approve, waitlist or reject, with an SMS to the applicant)
- Weekly pair suggestions: hard filters, then a weighted score (intent 45%, values 35%, everyday life 20%), then an allocation that serves the most constrained members first, within a 3-per-month quota
- Pair review showing both profiles, both voice intros, where they differ, a warning when intent alignment is low, and a Claude-drafted note to edit before approving
- Gift fulfilment queue, penalty review queue (ghosting, no-shows), a reports queue with "I need help" alerts first, venues, refunds and the SMS log

## Running locally

Requires Node 22 and Postgres 15+.

```bash
npm install
cp .env.example .env.local        # mock mode is on by default
createdb amora
export $(grep -v '^#' .env.local | grep -v '=$' | xargs)
npm run db:migrate
npm run db:seed -- --demo         # venues + 12 approved demo members with an active membership
npm run dev
```

In mock mode (`AMORA_MOCK_INTEGRATIONS=1`) the app makes no real SMS, M-Pesa or ID calls. OTP codes appear on screen, payments have an "approve" button, and every SMS lands in `/admin/sms`. Phones in `ADMIN_PHONES` (default `0700000001`) become matchmakers when they sign in. Apply with that number first. Demo members are `0799000001` to `0799000012`.

The scheduled job expires conversations, raises ghosting proposals, sends date reminders and sends drop notifications. Run it with:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/tick
```

`vercel.json` runs it once a day, because Vercel's Hobby plan allows only daily cron jobs. For launch it should run every 15 minutes (drop SMS, expiring conversations, date reminders): use a Pro plan (`*/15 * * * *`) or an external scheduler that calls the endpoint.

## Tests

```bash
npm test                          # unit: matching, standing, drop timing, phone, M-Pesa parsing
npm run build && npm run e2e      # full browser journey against a production build
```

The E2E suite needs a fresh database at `DATABASE_URL` (default `amora_e2e`) that has been migrated and seeded with `--demo`. Set `PLAYWRIGHT_CHROMIUM_PATH` to use a preinstalled Chromium.

## Production setup

| Piece | Status |
|---|---|
| Postgres | Any Postgres. On Supabase, use the transaction pooler (port 6543) connection string as `DATABASE_URL`; prepared statements are switched off automatically for it. Enable RLS on every table so Supabase's REST API can't read them |
| Hosting | Next.js 15 on Vercel |
| SMS | Africa's Talking, implemented (`AT_*` env vars) |
| M-Pesa | Daraja STK push and callback, implemented (`MPESA_*` env vars). Refunds are sent by hand from the M-Pesa portal |
| Identity | **Not live yet.** Smile ID needs a partner account, and their web capture component has to be wired into `src/lib/integrations/identity.ts`. Only mock mode works today |
| Claude | Profile drafts and match notes (`ANTHROPIC_API_KEY`). Falls back to template text without a key |

Before launch, register with the ODPC as a data controller and complete a DPIA. Identity checks and relationship preferences are sensitive personal data under the Kenya Data Protection Act, 2019.

## Layout

```
db/migrations/        SQL schema
scripts/              migrate and seed
src/lib/              config, matching, standing, questionnaire, auth, services, integrations
src/app/(public)/     landing, apply, verify, login
src/app/app/          member area
src/app/admin/        matchmaker console
src/app/api/          voice, payments, M-Pesa callback, cron, data export
tests/                unit (vitest) and e2e (playwright)
```
