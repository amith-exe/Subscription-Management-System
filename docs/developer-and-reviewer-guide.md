# Developer and Reviewer Guide

## Prerequisites

- Node.js 20 or newer
- npm with workspace support
- Docker Desktop
- PostgreSQL and Redis supplied by the compose file, or equivalent local services
- Google OAuth credentials for Google login testing
- SMTP credentials for verification/reset email testing

## First-time setup

1. Copy `.env.example` to `.env` and fill every required value. Keep secrets local and never commit `.env`.
2. Start infrastructure:

   ```bash
   docker compose up -d postgres redis
   ```

3. Install dependencies and generate the client:

   ```bash
   npm install
   npm run db:generate
   npm run db:migrate
   ```

4. Start the API:

   ```bash
   npm run dev
   ```

5. Start the web app in a second terminal:

   ```bash
   npm run dev:web
   ```

6. In development, open [Swagger UI](http://localhost:3001/api/docs). The OpenAPI document is at `/api/docs-json`.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Build every workspace |
| `npm run build --workspace @subscription/api` | Build only the API |
| `npm run test --workspace @subscription/api -- --runInBand` | Run API tests sequentially |
| `npm run lint` | Run workspace lint scripts |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Create/apply a development migration |
| `npm run db:seed` | Seed development data |
| `docker compose ps` | Check local PostgreSQL/Redis |

## Environment configuration

The API validates configuration at startup with Joi. Important groups are:

- Database: `DATABASE_URL`
- HTTP: `API_PORT`, `APP_URL`, `WEB_URL`, `CORS_ORIGINS`
- JWT: separate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- Mail: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- Feature flags: `SWAGGER_ENABLED`, `LOGIN_2FA_ENABLED`, `QUEUE_ENABLED`, `REDIS_ENABLED`, `RESET_METHOD`

Use test credentials in development. Do not print environment files, tokens, cookies, or SMTP/API secrets in logs or review comments.

## API implementation conventions

- Normalize email with trim and lowercase before querying.
- Use DTO classes with `class-validator` and Swagger decorators.
- Use `@Public()` only for explicitly public routes.
- Use `@Roles()` for role checks and `@CurrentUser()` for the authenticated identity.
- Keep customer isolation in the service layer, even if the controller also checks access.
- Use a Prisma transaction when multiple writes must succeed together.
- Use `Decimal` for money; do not convert to JavaScript floating point for calculations.
- Return explicit response DTOs or safe object shapes. Never return password hashes, OTP hashes, refresh-token hashes, reset-token hashes, or secrets.
- Add Swagger operation, response, and authentication metadata whenever a route is added.
- Add an audit event for security-sensitive actions.

## Review workflow

Review changes in this order:

1. Confirm the migration and Prisma schema agree.
2. Confirm authorization is enforced by guards and again in service-level tenant queries.
3. Check transaction boundaries and unique constraints for race conditions.
4. Check that error responses do not reveal account existence, credentials, or secret material.
5. Check OTP/reset expiry, attempt limits, single-use behavior, and token rotation.
6. Inspect Swagger for every controller route and verify public routes do not incorrectly show bearer requirements.
7. Run build, tests, lint, and the manual auth checks in `docs/auth-manual-tests.md`.
8. Verify logs and serialized responses contain no hashes or secrets.

## Authentication review checklist

- [ ] Public signup cannot choose a role.
- [ ] Signup creates `User` and `Customer` atomically.
- [ ] Login rejects unverified and inactive users.
- [ ] Wrong email and wrong password have the same public error.
- [ ] Account lockout returns `423` while locked.
- [ ] Refresh tokens are httpOnly cookies and are rotated.
- [ ] Reuse of a revoked refresh token revokes the token family.
- [ ] Reset requests have a generic response.
- [ ] Password reset and change revoke sessions appropriately.
- [ ] `mustChangePassword` blocks protected routes until changed.
- [ ] Google-created users are verified customers and do not accept a role from the browser.

## Known operational caveats

- Refresh cookies need a CSRF strategy for cross-site deployments; the current cookie uses httpOnly and same-site settings but CSRF protection belongs at the deployment edge or API layer.
- Queue processing is optional. When disabled, mail is sent directly through SMTP.
- Swagger is intentionally development-only; production API documentation should be published through an approved artifact pipeline if needed.
- If a platform-specific Next.js SWC binary is invalid, reinstall dependencies on the target OS before debugging application code.

