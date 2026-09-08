# Aayojak (आयजक)

Aayojak is a production-oriented event discovery, organizer, booking,
ticketing, and payment platform for Nepal and beyond. This repository is a
single pnpm monorepo with a React web client, an Express API, shared contracts,
and infrastructure configuration.

## Repository status

The repository is currently at **Phase 6 — Event Discovery + Event Details**.
The Prisma schema, modular Express foundation, real cookie-backed
authentication, responsive public web surfaces, server-side event discovery,
reviews, galleries, maps, and related-event queries are in place. Booking,
payment, ticketing, and management surfaces are intentionally introduced in
later phases. No production event data or simulated service responses are
included.

## Architecture

```text
apps/
  web/       React 19 + Vite + TypeScript client with API-backed public routes
  api/       Express + TypeScript service with Prisma persistence
packages/
  shared/    dependency-light API/domain contracts shared by web and API
  config/    environment and application configuration contracts
infra/
  docker-compose.yml  local PostgreSQL and service orchestration
  nginx/              reverse proxy configuration (later deployment phase)
docs/                 architectural and operational notes
```

The dependency direction is one-way: applications may depend on packages;
shared packages do not depend on either application. Business modules will be
organized by capability under `apps/api/src/modules` and by route/layout under
`apps/web/src`.

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16 (or Docker)

Copy `.env.example` to `.env` and replace secrets before running anything that
touches authentication, payments, media, or email providers.

`JWT_SECRET` is required and must be at least 32 characters; the API does not
provide a fallback signing secret.

## Development commands

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
```

Database commands use the Prisma schema in `apps/api/prisma`:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

The seed creates development-only admin, organizer, and attendee accounts,
categories, free and paid events, ticket tiers, bookings, tickets, payment
records, reviews, and a notification. It uses bcrypt hashes and never stores a
plaintext password. The credentials printed by the seed are not suitable for
any shared or production environment.

PostgreSQL must be running and `DATABASE_URL` must be configured before
`pnpm db:migrate` or `pnpm db:seed`. Prisma client generation does not require
an active database, but it does require the workspace dependencies to be
installed.

## API foundation

The API is mounted under `/api` and uses `{ success, data }` for successful
responses and `{ success, error: { code, message, details } }` for errors.
The current API surface includes health, current-user, public events,
event detail media/FAQs/ticket tiers, related events, categories, organizers,
event reviews, authenticated bookings, tickets, notifications, and an
admin-protected overview. Event list filters and pagination are validated with
Zod and execute against Prisma; unpublished events are excluded from public
discovery and related-event queries. Organizer accounts can manage their own
profile, draft/submitted events, media references, FAQs, ticket tiers,
bookings, attendees, tickets, revenue, and analytics through owner-scoped
routes under `/api/organizers/me`.

Authentication endpoints include `/api/auth/register`, `/login`, `/logout`,
`/refresh`, `/me`, `/forgot-password`, `/reset-password`, `/verify-email`,
`/resend-verification`, and `/google` with its callback route.

Authentication uses short-lived HttpOnly access cookies and rotating,
database-backed refresh sessions. Refresh tokens, password-reset tokens, and
email-verification tokens are stored only as SHA-256 hashes. Google OAuth uses
state validation and will return a configuration error until Google
credentials are supplied. The development email adapter explicitly reports
that delivery is not configured rather than pretending an email was sent.

For Google OAuth, register the callback URL from `GOOGLE_CALLBACK_URL` in the
Google Cloud OAuth client. The API redirects successful OAuth sessions to
`/auth/callback` on `FRONTEND_URL`; no access or refresh token is placed in the
redirect URL.

## Quality and security principles

- Server-side authorization is the source of truth; frontend guards are only a
  usability layer.
- Payment providers, email, and media storage are adapters behind interfaces.
- The server calculates totals and verifies payment callbacks before confirming
  bookings.
- Secrets belong in environment configuration and are never bundled into the
  client.
- External services that cannot be run locally are reported as partially
  verified instead of being simulated.

Detailed API, deployment, provider setup, and operational documentation will be
added alongside their implementation phases.
