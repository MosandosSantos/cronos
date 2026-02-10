DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadStage') THEN
    CREATE TYPE "LeadStage" AS ENUM ('LEAD', 'CONTATO', 'PROPOSTA', 'NEGOCIACAO', 'FECHADO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadStatus') THEN
    CREATE TYPE "LeadStatus" AS ENUM ('ABERTO', 'GANHO', 'PERDIDO');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "Lead" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_name" TEXT NOT NULL,
  "contact_name" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "city" TEXT,
  "source" TEXT,
  "stage" "LeadStage" NOT NULL DEFAULT 'LEAD',
  "status" "LeadStatus" NOT NULL DEFAULT 'ABERTO',
  "estimated_value" DECIMAL(12,2),
  "close_reason" TEXT,
  "next_step" TEXT,
  "next_step_at" TIMESTAMP(3),
  "owner_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Lead"
SET "tags" = ARRAY[]::TEXT[]
WHERE "tags" IS NULL;
