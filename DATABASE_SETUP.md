# Database Setup & Connection Guide

This guide provides comprehensive instructions for running, migrating, seeding, and connecting to the PostgreSQL database for the **Subscription Management System**.

---

## 1. Architecture Overview

* **Database Engine:** PostgreSQL 16 (`postgres:16-alpine`)
* **Cache & Message Broker:** Redis 7 (`redis:7-alpine`)
* **ORM:** Prisma 6 (`@prisma/client`)
* **Schema Location:** [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma)
* **Configuration:** Consolidated in [`apps/api/.env`](apps/api/.env)

---

## 2. Prerequisites

* **Docker Desktop:** Installed and running.
* **Node.js:** `>= 20.0.0`
* **npm:** `>= 10.0.0`

---

## 3. Environment Configuration

To prevent duplicate variable collisions across npm workspaces, all database environment variables belong in **`apps/api/.env`**.

Create `apps/api/.env` (from `apps/api/.env.example` if available):

```env
DATABASE_URL=postgresql://subscriptions:subscriptions@localhost:5432/subscriptions?schema=public
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your-random-jwt-access-secret
JWT_REFRESH_SECRET=your-random-jwt-refresh-secret
WEB_URL=http://localhost:3000
API_PORT=3001
NODE_ENV=development
```

> [!IMPORTANT]
> **Windows Port Collision (5432 vs 5433):**
> If you already have PostgreSQL installed natively on your host machine (e.g. PostgreSQL 16 or 18 running as a Windows service), host port `5432` will already be occupied.
>
> In that case:
> 1. In `docker-compose.yml`, change the port mapping for postgres to `"5433:5432"`.
> 2. In `apps/api/.env`, update your `DATABASE_URL` port to `5433`:
>    ```env
>    DATABASE_URL=postgresql://subscriptions:subscriptions@localhost:5433/subscriptions?schema=public
>    ```

---

## 4. Running the Database (Docker Compose)

Start the PostgreSQL and Redis containers in the background:

```powershell
docker compose up -d postgres redis
```

Verify that both containers are healthy and running:

```powershell
docker ps
```

You should see:
* `subscription-management-system-postgres-1` (port `5432` or `5433`)
* `subscription-management-system-redis-1` (port `6379`)

To stop the containers:
```powershell
docker compose down
```

---

## 5. Schema Sync, Migrations & Seeding

Run all commands from the root repository directory:

### A. Generate Prisma Client
Generates the type-safe Prisma client in `node_modules/@prisma/client`:
```powershell
npm run db:generate
```

### B. Push or Migrate Database Schema
Push the current Prisma schema directly to your local database:
```powershell
npx prisma db push --schema apps/api/prisma/schema.prisma
```
Or apply versioned migrations:
```powershell
npm run db:migrate
```

### C. Seed Test Data
Populates the database with realistic subscription data covering paid, overdue, partially paid, discounted, quotation, and variant pricing records:
```powershell
npm run db:seed
```

---

## 6. How to Connect & Inspect the Database

### Option 1: Prisma Studio (Recommended Web GUI)
Prisma Studio provides an interactive web interface to view, filter, and modify records in all tables.

Run from the root repository:
```powershell
npm run db:studio
```
*(Alternative: `cd apps/api; npx prisma studio`)*

Then open **http://localhost:5555** in your browser.

---

### Option 2: Database GUI Clients (DBeaver, TablePlus, pgAdmin, VS Code)
You can connect using any standard PostgreSQL client with these settings:

| Parameter | Default Docker Setup | Port Conflict Setup (If host Postgres running) |
| :--- | :--- | :--- |
| **Host** | `localhost` or `127.0.0.1` | `localhost` or `127.0.0.1` |
| **Port** | `5432` | `5433` |
| **Database** | `subscriptions` | `subscriptions` |
| **Username** | `subscriptions` | `subscriptions` |
| **Password** | `subscriptions` | `subscriptions` |
| **SSL Mode** | `disable` | `disable` |

**Full Connection URL:**
```
postgresql://subscriptions:subscriptions@localhost:5432/subscriptions?schema=public
```
*(Use port `5433` if port was remapped).*

---

### Option 3: Terminal CLI (`psql` via Docker)
To query the database directly from your command line:

```powershell
docker compose exec postgres psql -U subscriptions -d subscriptions
```

Helpful `psql` shortcuts:
* `\dt` — List all tables
* `\d "Subscription"` — Describe table schema
* `SELECT * FROM "User";` — Query user records
* `\q` — Exit

---

## 7. Troubleshooting & Common Issues

### Issue 1: `Authentication failed against database server for user 'subscriptions'`
* **Cause:** Port `5432` is already in use by a local PostgreSQL installation running on your operating system (e.g. Windows service `postgresql-x64-18`). Your connection was intercepted by your local database instead of Docker.
* **Fix:** Change `docker-compose.yml` to `"5433:5432"`, change `DATABASE_URL` in `apps/api/.env` to port `5433`, and restart Docker:
  ```powershell
  docker compose down postgres; docker compose up -d postgres
  ```

---

### Issue 2: `There is a conflict between env vars in apps\api\.env and .env`
* **Cause:** Prisma strictly forbids having duplicate environment variable definitions in both root `.env` and `apps/api/.env`.
* **Fix:** Delete the root `.env` file and consolidate all variables inside `apps/api/.env`.

---

### Issue 3: Prisma Studio throws `error: Environment variable not found: DATABASE_URL`
* **Cause:** Prisma Studio was run from the root directory without specifying workspace context or schema location, so its background query worker could not locate `apps/api/.env`.
* **Fix:** Always start studio using the workspace script:
  ```powershell
  npm run db:studio
  ```
  or run from the API folder:
  ```powershell
  cd apps/api
  npx prisma studio
  ```

---

### Issue 4: Slow npm package downloads or hangs during engine downloads
* **Cause:** Certain Wi-Fi providers experience high packet loss on IPv6 routes to Cloudflare/registry.
* **Fix:** Force IPv4 resolution:
  ```powershell
  $env:NODE_OPTIONS = "--dns-result-order=ipv4first"
  npm install --prefer-offline
  ```
