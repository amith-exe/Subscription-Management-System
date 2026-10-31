# Subscription Management System

## API documentation

When the API is running in development, Swagger UI is available at `http://localhost:3001/api/docs` and the OpenAPI JSON document at `http://localhost:3001/api/docs-json`. The API port can be changed with `API_PORT`.

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

Database setup, connection options, Prisma Studio, and troubleshooting are documented in [DATABASE_SETUP.md](DATABASE_SETUP.md).

## Connected portal features

The portal uses the API configured by `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`). Sign in through the API; the portal uses the access token for protected requests and the refresh cookie to renew sessions. Role checks in the UI control which actions are shown, and the API remains responsible for enforcing access.

| Area | Connected API operations | Portal access |
| --- | --- | --- |
| Authentication | Login, refresh, logout, change password | All signed-in roles |
| Products | List, create, edit, add/remove variants | All roles can view; Admin manages catalog |
| Discounts | List, create, edit, deactivate | All roles can view eligible discounts; Admin manages |
| Invoices | List, details, PDF, confirm, cancel, send | Customer sees own invoices; Admin/Internal manage invoice actions |
| Plans | List, create, edit, pause/close/renew policy checks | Admin/Internal view and run policy checks; Admin manages plan definitions |
| Taxes | List, create, edit | Admin/Internal |

Plan pause, close, and renew routes currently validate the configured plan policy and return whether the action is permitted; they do not change subscription state. The analytics, payments, and subscription modules do not currently expose HTTP controllers, so they are not presented as connected portal actions yet. The API docs list the routes available in the running build.

## Design rules

- Money uses Prisma `Decimal`; never JavaScript floats.
- Billing is idempotent through the unique invoice period constraint and transaction boundaries.
- State changes go through transition maps, never direct controller status updates.
- Customer scoping is enforced in services as well as controllers.
- Reporting belongs in raw SQL/materialized views and snapshot tables when the query is heavy.
