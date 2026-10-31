CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_subscriptionId_periodStart_periodEnd_key"
  ON "Invoice"("subscriptionId", "periodStart", "periodEnd");

CREATE INDEX IF NOT EXISTS "Subscription_status_nextBillingDate_idx"
  ON "Subscription"("status", "nextBillingDate");
