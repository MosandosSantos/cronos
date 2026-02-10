DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TrainingModality') THEN
    CREATE TYPE "TrainingModality" AS ENUM (
      'PRESENCIAL',
      'SEMIPRESENCIAL',
      'EAD',
      'APOSTILA',
      'VIDEO'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "CatalogTrainingType" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "validity_days" INTEGER NOT NULL DEFAULT 365,
  "target_audience" TEXT NOT NULL DEFAULT 'Geral',
  "duration_hours" INTEGER NOT NULL DEFAULT 1,
  "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
  "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "didactic_material" TEXT,
  "modality" "TrainingModality" NOT NULL DEFAULT 'PRESENCIAL',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogTrainingType_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CatalogTrainingType"
  ADD COLUMN IF NOT EXISTS "target_audience" TEXT NOT NULL DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS "duration_hours" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "didactic_material" TEXT,
  ADD COLUMN IF NOT EXISTS "modality" "TrainingModality" NOT NULL DEFAULT 'PRESENCIAL';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CatalogTrainingType_price_non_negative_check'
  ) THEN
    ALTER TABLE "CatalogTrainingType"
      ADD CONSTRAINT "CatalogTrainingType_price_non_negative_check" CHECK ("price" >= 0);
  END IF;
END
$$;
