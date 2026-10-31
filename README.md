# Subscription Management System

## API documentation

When the API is running, Swagger UI is available at `http://localhost:3001/docs` and the OpenAPI JSON document at `http://localhost:3001/docs-json`. The documentation includes the currently implemented invoice and discount endpoints. The API port can be changed with `API_PORT`.

A modular-monolith subscription and billing platform built with NestJS, Prisma, PostgreSQL, Redis/BullMQ, and Next.js.

## Workspace layout

- `apps/api`: NestJS API, domain modules, billing jobs, Prisma schema
- `apps/web`: Next.js role-based portal shell
- `services/ml`: optional FastAPI prototype for analytics experiments
- `docker-compose.yml`: local PostgreSQL and Redis

## Start locally

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Run the web portal separately with `npm run dev:web`.

## Razorpay invoice payments

Add Razorpay **Test Mode** credentials to the root `.env` before accepting test payments:

```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

Apply the payment-attempt migration, then run the API and web app. Customers sign in at `/portal`; confirmed invoice balances show a Razorpay checkout button. Configure a Razorpay Test Mode webhook to `https://<your-public-api-host>/payments/webhook` and subscribe to `payment.captured`. Use the same webhook secret in `RAZORPAY_WEBHOOK_SECRET`. The checkout callback is also verified against Razorpay's payment API before the invoice is updated.

Never put `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` in browser code or commit real credentials. Use Test Mode credentials for development and separate Live Mode credentials for production.

## Design rules

- Money uses Prisma `Decimal`; never JavaScript floats.
- Billing is idempotent through the unique invoice period constraint and transaction boundaries.
- State changes go through transition maps, never direct controller status updates.
- Customer scoping is enforced in services as well as controllers.
- Reporting belongs in raw SQL/materialized views and snapshot tables when the query is heavy.
