-- Add billing_cycle to SaasContract
ALTER TABLE "SaasContract"
ADD COLUMN "billing_cycle" TEXT NOT NULL DEFAULT 'MONTHLY';
