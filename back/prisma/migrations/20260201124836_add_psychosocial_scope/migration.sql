-- AlterTable
ALTER TABLE "PsychosocialSurvey" ADD COLUMN     "area_id" UUID,
ADD COLUMN     "site_id" UUID;

-- CreateIndex
CREATE INDEX "PsychosocialSurvey_site_id_idx" ON "PsychosocialSurvey"("site_id");

-- CreateIndex
CREATE INDEX "PsychosocialSurvey_area_id_idx" ON "PsychosocialSurvey"("area_id");

-- AddForeignKey
ALTER TABLE "PsychosocialSurvey" ADD CONSTRAINT "PsychosocialSurvey_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychosocialSurvey" ADD CONSTRAINT "PsychosocialSurvey_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
