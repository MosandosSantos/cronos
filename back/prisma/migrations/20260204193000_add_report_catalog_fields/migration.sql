CREATE TABLE IF NOT EXISTS "CatalogReportType" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT,
  "name" TEXT NOT NULL,
  "validity_days" INTEGER NOT NULL DEFAULT 365,
  "generate_alert" BOOLEAN NOT NULL DEFAULT true,
  "alert_days_1" INTEGER,
  "alert_days_2" INTEGER,
  "alert_days_3" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogReportType_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CatalogReportType"
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "generate_alert" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "alert_days_1" INTEGER,
  ADD COLUMN IF NOT EXISTS "alert_days_2" INTEGER,
  ADD COLUMN IF NOT EXISTS "alert_days_3" INTEGER;

UPDATE "CatalogReportType"
SET "code" = upper(regexp_replace("name", '[^A-Za-z0-9]+', '_', 'g'))
WHERE "code" IS NULL OR trim("code") = '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CatalogReportType"
    WHERE "code" IS NULL OR trim("code") = ''
  ) THEN
    RAISE EXCEPTION 'Nao foi possivel gerar codigo para todos os tipos de laudo existentes.';
  END IF;
END $$;

ALTER TABLE "CatalogReportType"
  ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "CatalogReportType_code_key"
  ON "CatalogReportType"("code");

ALTER TABLE "CatalogReportType"
  DROP CONSTRAINT IF EXISTS "CatalogReportType_validity_days_positive_check";
ALTER TABLE "CatalogReportType"
  ADD CONSTRAINT "CatalogReportType_validity_days_positive_check"
  CHECK ("validity_days" > 0);

ALTER TABLE "CatalogReportType"
  DROP CONSTRAINT IF EXISTS "CatalogReportType_alert_days_non_negative_check";
ALTER TABLE "CatalogReportType"
  ADD CONSTRAINT "CatalogReportType_alert_days_non_negative_check"
  CHECK (
    ("alert_days_1" IS NULL OR "alert_days_1" >= 0)
    AND ("alert_days_2" IS NULL OR "alert_days_2" >= 0)
    AND ("alert_days_3" IS NULL OR "alert_days_3" >= 0)
  );

ALTER TABLE "CatalogReportType"
  DROP CONSTRAINT IF EXISTS "CatalogReportType_alert_days_order_check";
ALTER TABLE "CatalogReportType"
  ADD CONSTRAINT "CatalogReportType_alert_days_order_check"
  CHECK (
    "alert_days_1" IS NULL
    OR "alert_days_2" IS NULL
    OR "alert_days_3" IS NULL
    OR ("alert_days_1" > "alert_days_2" AND "alert_days_2" > "alert_days_3")
  );
