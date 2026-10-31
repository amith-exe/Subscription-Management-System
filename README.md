# Subscription Management System

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

## Design rules

- Money uses Prisma `Decimal`; never JavaScript floats.
- Billing is idempotent through the unique invoice period constraint and transaction boundaries.
- State changes go through transition maps, never direct controller status updates.
- Customer scoping is enforced in services as well as controllers.
- Reporting belongs in raw SQL/materialized views and snapshot tables when the query is heavy.
