DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContractStatus') THEN
    CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CANCELED', 'OVERDUE');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "SaasContract" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "client_id" UUID,
  "proposal_id" UUID,
  "plan_name" TEXT NOT NULL,
  "employee_limit" INTEGER NOT NULL,
  "contract_value" DECIMAL(12,2) NOT NULL,
  "start_date" TIMESTAMP(3) NOT NULL,
  "end_date" TIMESTAMP(3),
  "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaasContract_pkey" PRIMARY KEY ("id")
);

-- Switch SaasContract from tenant_id to client_id
ALTER TABLE "SaasContract" DROP CONSTRAINT IF EXISTS "SaasContract_tenant_id_fkey";
DROP INDEX IF EXISTS "SaasContract_tenant_id_idx";

ALTER TABLE "SaasContract" ADD COLUMN IF NOT EXISTS "client_id" UUID;
ALTER TABLE "SaasContract" DROP COLUMN IF EXISTS "tenant_id";

CREATE INDEX IF NOT EXISTS "SaasContract_client_id_idx" ON "SaasContract"("client_id");
ALTER TABLE "SaasContract"
  ADD CONSTRAINT "SaasContract_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
