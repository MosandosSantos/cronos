-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RiskType" AS ENUM ('BIOLOGICO', 'FISICO', 'QUIMICO', 'OUTRO');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "accident_monthly_goal" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRole" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "job_role_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "cpf" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "risk_type" "RiskType" NOT NULL,
    "exposure_frequency" TEXT NOT NULL,
    "possible_harm" TEXT NOT NULL,
    "risk_grade" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "existing_controls" TEXT,
    "needs_ppe" BOOLEAN NOT NULL DEFAULT false,
    "ppe_list" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPlan" (
    "id" UUID NOT NULL,
    "risk_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionTask" (
    "id" UUID NOT NULL,
    "action_plan_id" UUID NOT NULL,
    "assignee_user_id" UUID,
    "title" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "due_date" TIMESTAMP(3),
    "sla_days" INTEGER,
    "recurrence_rule" TEXT,
    "evidence_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_type" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "file_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "inspector_user_id" UUID NOT NULL,
    "template_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionItem" (
    "id" UUID NOT NULL,
    "inspection_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "worker_id" UUID,
    "risk_id" UUID,
    "cause" TEXT,
    "victim_status" TEXT,
    "ppe_ok" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsychosocialSurvey" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsychosocialSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsychosocialQuestion" (
    "id" UUID NOT NULL,
    "psychosocial_survey_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsychosocialQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsychosocialResponse" (
    "id" UUID NOT NULL,
    "psychosocial_survey_id" UUID NOT NULL,
    "anonymous_token" TEXT NOT NULL,
    "answers_json" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsychosocialResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PcmsoExam" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "area_id" UUID,
    "job_role_id" UUID,
    "frequency" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PcmsoExam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_name_key" ON "Tenant"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenant_id_idx" ON "User"("tenant_id");

-- CreateIndex
CREATE INDEX "Site_tenant_id_idx" ON "Site"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Site_tenant_id_name_key" ON "Site"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "Area_site_id_idx" ON "Area"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "Area_site_id_name_key" ON "Area"("site_id", "name");

-- CreateIndex
CREATE INDEX "JobRole_tenant_id_idx" ON "JobRole"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "JobRole_tenant_id_name_key" ON "JobRole"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "Worker_tenant_id_idx" ON "Worker"("tenant_id");

-- CreateIndex
CREATE INDEX "Worker_area_id_idx" ON "Worker"("area_id");

-- CreateIndex
CREATE INDEX "Worker_job_role_id_idx" ON "Worker"("job_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_tenant_id_full_name_key" ON "Worker"("tenant_id", "full_name");

-- CreateIndex
CREATE INDEX "Risk_area_id_idx" ON "Risk"("area_id");

-- CreateIndex
CREATE UNIQUE INDEX "Risk_area_id_title_key" ON "Risk"("area_id", "title");

-- CreateIndex
CREATE INDEX "ActionPlan_risk_id_idx" ON "ActionPlan"("risk_id");

-- CreateIndex
CREATE INDEX "ActionTask_action_plan_id_idx" ON "ActionTask"("action_plan_id");

-- CreateIndex
CREATE INDEX "ActionTask_assignee_user_id_idx" ON "ActionTask"("assignee_user_id");

-- CreateIndex
CREATE INDEX "Evidence_tenant_id_idx" ON "Evidence"("tenant_id");

-- CreateIndex
CREATE INDEX "Evidence_owner_type_owner_id_idx" ON "Evidence"("owner_type", "owner_id");

-- CreateIndex
CREATE INDEX "Inspection_area_id_idx" ON "Inspection"("area_id");

-- CreateIndex
CREATE INDEX "Inspection_inspector_user_id_idx" ON "Inspection"("inspector_user_id");

-- CreateIndex
CREATE INDEX "InspectionItem_inspection_id_idx" ON "InspectionItem"("inspection_id");

-- CreateIndex
CREATE INDEX "Incident_area_id_idx" ON "Incident"("area_id");

-- CreateIndex
CREATE INDEX "Incident_worker_id_idx" ON "Incident"("worker_id");

-- CreateIndex
CREATE INDEX "Incident_risk_id_idx" ON "Incident"("risk_id");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_occurred_at_worker_id_risk_id_key" ON "Incident"("occurred_at", "worker_id", "risk_id");

-- CreateIndex
CREATE INDEX "PsychosocialSurvey_tenant_id_idx" ON "PsychosocialSurvey"("tenant_id");

-- CreateIndex
CREATE INDEX "PsychosocialQuestion_psychosocial_survey_id_idx" ON "PsychosocialQuestion"("psychosocial_survey_id");

-- CreateIndex
CREATE INDEX "PsychosocialResponse_psychosocial_survey_id_idx" ON "PsychosocialResponse"("psychosocial_survey_id");

-- CreateIndex
CREATE INDEX "PcmsoExam_tenant_id_idx" ON "PcmsoExam"("tenant_id");

-- CreateIndex
CREATE INDEX "PcmsoExam_area_id_idx" ON "PcmsoExam"("area_id");

-- CreateIndex
CREATE INDEX "PcmsoExam_job_role_id_idx" ON "PcmsoExam"("job_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "PcmsoExam_tenant_id_name_area_id_job_role_id_key" ON "PcmsoExam"("tenant_id", "name", "area_id", "job_role_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRole" ADD CONSTRAINT "JobRole_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_job_role_id_fkey" FOREIGN KEY ("job_role_id") REFERENCES "JobRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "Risk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionTask" ADD CONSTRAINT "ActionTask_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "ActionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionTask" ADD CONSTRAINT "ActionTask_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_inspector_user_id_fkey" FOREIGN KEY ("inspector_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItem" ADD CONSTRAINT "InspectionItem_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "Inspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "Risk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychosocialSurvey" ADD CONSTRAINT "PsychosocialSurvey_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychosocialQuestion" ADD CONSTRAINT "PsychosocialQuestion_psychosocial_survey_id_fkey" FOREIGN KEY ("psychosocial_survey_id") REFERENCES "PsychosocialSurvey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychosocialResponse" ADD CONSTRAINT "PsychosocialResponse_psychosocial_survey_id_fkey" FOREIGN KEY ("psychosocial_survey_id") REFERENCES "PsychosocialSurvey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PcmsoExam" ADD CONSTRAINT "PcmsoExam_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PcmsoExam" ADD CONSTRAINT "PcmsoExam_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PcmsoExam" ADD CONSTRAINT "PcmsoExam_job_role_id_fkey" FOREIGN KEY ("job_role_id") REFERENCES "JobRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
