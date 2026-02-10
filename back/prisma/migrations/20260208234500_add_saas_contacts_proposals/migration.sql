DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProposalStatus') THEN
    CREATE TYPE "ProposalStatus" AS ENUM ('SENT', 'NEGOTIATING', 'APPROVED', 'REJECTED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "SaasContact" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "company_name" TEXT NOT NULL,
  "source" TEXT,
  "notes" TEXT,
  "next_action_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaasContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SaasProposal" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "contact_id" UUID NOT NULL,
  "proposed_value" DECIMAL(12,2) NOT NULL,
  "valid_until" TIMESTAMP(3) NOT NULL,
  "status" "ProposalStatus" NOT NULL DEFAULT 'SENT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaasProposal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SaasProposal_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "SaasContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SaasProposal_contact_id_idx" ON "SaasProposal"("contact_id");

ALTER TABLE "SaasContract"
  ADD CONSTRAINT IF NOT EXISTS "SaasContract_proposal_id_fkey"
  FOREIGN KEY ("proposal_id") REFERENCES "SaasProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "SaasContract_proposal_id_key" ON "SaasContract"("proposal_id");
