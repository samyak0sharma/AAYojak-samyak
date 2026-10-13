# Aayojak deployment

## Production prerequisites

- Node.js 20+ and pnpm 9+, or Docker.
- PostgreSQL 16 with durable backups.
- A production `DATABASE_URL` and strong `JWT_SECRET`.
- A non-console email provider.
- Production payment credentials and callback URLs when payments are enabled.
- HTTPS for the frontend and API origin.

Payment operations

- Khalti refunds are initiated from the admin payment console and only mark a
  booking refunded after the provider accepts the refund request.
- The admin payment routes are `GET /api/admin/payments` and
  `POST /api/admin/payments/:paymentId/refund`; both require an authenticated
  `ADMIN` account.
- eSewa refunds are recorded as `MANUAL_REQUIRED`; an operator must complete
  the provider-side refund and reconcile the transaction before treating it as
  settled. Never mark an eSewa payment refunded only from a customer redirect.
- Run provider sandbox and production callback tests separately. Keep
  `KHALTI_REFUND_BASE_URL` and the eSewa status URL on production endpoints in
  production environments.

## Database migrations

Fresh environments apply the committed Prisma baseline with:

```bash
pnpm db:migrate:deploy
```

An existing database created before migrations were committed must be manually
baselined by an operator after comparing its schema with the migration. Do not
run the baseline against an existing production database without that review.

## Docker

`infra/docker-compose.production.yml` runs PostgreSQL, the API, and the static
web container. Supply an `infra/.env.production` file from a secret manager;
never commit production credentials. The API container applies migrations before
starting and exposes only its internal port to the web service.

## Release checks

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm -r build` in CI. Verify
the `/api/health` endpoint, payment callback URLs, secure cookies, backups,
monitoring, and rollback procedures in staging before production rollout.
