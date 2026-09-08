# Aayojak architecture notes

## Phase 1 boundaries

The repository is intentionally split into four dependency layers:

1. `packages/config` contains environment-independent application constants.
2. `packages/shared` contains serializable contracts safe for both runtimes.
3. `apps/api` owns HTTP, validation, authorization, integrations, and Prisma.
4. `apps/web` owns rendering, interaction, route composition, and server-state
   consumption through the API client.

The API is organized by business module (`auth`, `events`, `bookings`,
`payments`, `reports`, `uploads`, and so on), with cross-cutting concerns in
`middleware`, `services`, `lib`, and `config`. Payment, email, and media
providers will be injected behind interfaces so provider-specific code cannot
leak into domain workflows.

## Runtime contracts

- API responses use `{ data, error }` and will add pagination metadata without
  changing the top-level shape.
- The client will never calculate authoritative totals or payment status.
- Authentication and role enforcement remain server-side even when the web app
  uses protected route components.
- Access JWTs are short-lived HttpOnly cookies; refresh sessions and one-time
  email/reset tokens are represented by hashes in PostgreSQL.
- OAuth callbacks must validate a short-lived HttpOnly state cookie before an
  application session is issued.
