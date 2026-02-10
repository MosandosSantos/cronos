DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AsoExamKind') THEN
    CREATE TYPE "AsoExamKind" AS ENUM (
      'ADMISSIONAL',
      'PERIODICO',
      'RETORNO_TRABALHO',
      'MUDANCA_FUNCAO',
      'DEMISSIONAL',
      'MONITORACAO_PONTUAL'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "CatalogAsoType" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "kind" "AsoExamKind",
  "name" TEXT NOT NULL,
  "description" TEXT,
  "legal_basis" TEXT,
  "trigger_condition" TEXT,
  "validity_days" INTEGER NOT NULL DEFAULT 365,
  "is_esocial_only" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogAsoType_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CatalogAsoType"
  ADD COLUMN IF NOT EXISTS "kind" "AsoExamKind",
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "legal_basis" TEXT,
  ADD COLUMN IF NOT EXISTS "trigger_condition" TEXT,
  ADD COLUMN IF NOT EXISTS "is_esocial_only" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "CatalogAsoType_kind_key"
  ON "CatalogAsoType"("kind");
