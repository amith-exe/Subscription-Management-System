ALTER TABLE "Invoice"
  ADD COLUMN "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "Invoice" AS invoice
SET "amountPaid" = COALESCE((
  SELECT SUM(payment."amount")
  FROM "Payment" AS payment
  WHERE payment."invoiceId" = invoice."id"
), 0);
