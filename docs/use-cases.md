# Use Cases

## Actors

| Actor | Description |
| --- | --- |
| Visitor | Unauthenticated person creating or verifying an account |
| Customer | Authenticated subscriber who can view their own subscriptions and invoices |
| Internal staff | Authenticated operational user with staff permissions and mandatory password change after invitation |
| Admin | Staff administrator who can create internal users and manage privileged operations |
| Payment provider | Razorpay callback/order participant |
| Scheduler/worker | Scheduled billing and notification execution |

## Account and authentication use cases

### UC-01: Sign up

1. Visitor submits name, normalized email, and a strong password.
2. API rejects duplicate email with `409`.
3. API creates a `CUSTOMER` user and linked customer profile atomically.
4. API creates a six-digit verification OTP and sends it by email.
5. User cannot log in until `emailVerifiedAt` is set.

### UC-02: Verify email

The visitor submits email and OTP. The API checks expiry, attempt limit, constant-time hash comparison, and single-use state before marking the user verified.

### UC-03: Log in

The user submits email and password. The API uses a generic invalid-credentials response, rejects inactive/unverified users, applies lockout thresholds, and issues a short-lived access token plus a rotating refresh-cookie session.

### UC-04: Google login

The visitor starts `/auth/google`. Google redirects to the callback with a verified profile. Existing users are logged in. New users are created as verified `CUSTOMER` accounts with a linked customer record in one transaction.

### UC-05: Recover a password

The visitor submits an email. The API always returns the same response whether the account exists. Existing users receive a single-use, hashed reset link with a 15-minute expiry. Successful reset revokes refresh sessions and clears lockout state.

### UC-06: Change a password

An authenticated user supplies the current password and a new strong password. Other refresh sessions are revoked and `mustChangePassword` is cleared.

## Subscription lifecycle use cases

### UC-07: Build the catalog

Authorized staff create products, variants, taxes, and plans. Prices are stored as decimal values and product/variant references are protected by relational constraints.

### UC-08: Create a quotation template

Staff create a reusable template for a plan with product lines, quantities, and optional variants. A template can later seed a subscription.

### UC-09: Create a subscription

Staff create a subscription for a customer and plan. The service calculates line prices, variants, taxes, totals, and a sequential subscription number in a transaction.

### UC-10: Transition a subscription

Authorized staff move a subscription through allowed states such as draft, quotation, confirmed, active, and closed. Invalid transitions are rejected by the central transition map.

### UC-11: Generate an invoice

The billing service selects due subscriptions, applies eligible discounts, reserves usage atomically, creates invoice lines, and ensures the subscription period cannot be invoiced twice.

### UC-12: Collect payment

Staff can record a manual payment. For Razorpay, the API creates a payment attempt, returns provider checkout data, verifies the callback signature, records the payment, and updates invoice status/balance.

### UC-13: Customer self-service

Customers use portal routes to view only their own subscriptions and invoices, download invoice PDFs, and request permitted subscription closure. Customer IDs are taken from the authenticated user context, never from arbitrary request input.

## Operations and governance use cases

### UC-14: Create internal staff

An admin submits an email and temporary password for an internal user. The API creates the `INTERNAL` account, sets `mustChangePassword`, and sends an invite. Public signup cannot select a role.

### UC-15: Audit security events

Signup, successful/failed login, lockout, password changes/resets, staff creation, logout-all, and refresh-token reuse are recorded through `AuditService.log` without storing passwords, OTP hashes, or token hashes.

### UC-16: Review analytics

Authorized users can inspect subscription summaries, MRR movement, aging, and top-plan reports. Heavy reporting should use snapshots or database-side aggregation rather than loading all transactional rows into memory.

