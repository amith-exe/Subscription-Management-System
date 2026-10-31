-- API tax rates are percentage units (18 means 18%). Seeded legacy percentage values used fractions (0.18).
ALTER TABLE "Tax" ALTER COLUMN "rate" TYPE DECIMAL(7,4);
ALTER TABLE "SubscriptionLine" ALTER COLUMN "taxRate" TYPE DECIMAL(7,4);
ALTER TABLE "InvoiceLine" ALTER COLUMN "taxRate" TYPE DECIMAL(7,4);

UPDATE "SubscriptionLine" AS line
SET "taxRate" = line."taxRate" * 100
FROM "Tax" AS tax
WHERE line."taxId" = tax."id" AND tax."type" = 'PERCENTAGE' AND tax."rate" > 0 AND tax."rate" <= 1;

UPDATE "InvoiceLine" AS invoice_line
SET "taxRate" = invoice_line."taxRate" * 100
FROM "Invoice" AS invoice, "SubscriptionLine" AS subscription_line, "Tax" AS tax
WHERE invoice_line."invoiceId" = invoice."id"
  AND invoice."subscriptionId" = subscription_line."subscriptionId"
  AND invoice_line."productId" = subscription_line."productId"
  AND subscription_line."taxId" = tax."id"
  AND tax."type" = 'PERCENTAGE' AND tax."rate" > 0 AND tax."rate" <= 1
  AND invoice_line."taxRate" > 0 AND invoice_line."taxRate" <= 1;

UPDATE "Tax" SET "rate" = "rate" * 100
WHERE "type" = 'PERCENTAGE' AND "rate" > 0 AND "rate" <= 1;
