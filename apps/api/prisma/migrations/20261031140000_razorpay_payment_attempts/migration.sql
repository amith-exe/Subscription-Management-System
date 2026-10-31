CREATE TYPE "PaymentAttemptStatus" AS ENUM ('CREATED', 'PAID', 'FAILED');

CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "providerOrderId" TEXT NOT NULL,
  "paymentId" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'CREATED',
  "method" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAttempt_providerOrderId_key" ON "PaymentAttempt"("providerOrderId");
CREATE UNIQUE INDEX "PaymentAttempt_paymentId_key" ON "PaymentAttempt"("paymentId");
CREATE INDEX "PaymentAttempt_invoiceId_status_idx" ON "PaymentAttempt"("invoiceId", "status");
CREATE UNIQUE INDEX "PaymentAttempt_one_created_order_per_invoice"
  ON "PaymentAttempt"("invoiceId") WHERE "status" = 'CREATED';
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
