DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadStage') THEN
    CREATE TYPE "LeadStage" AS ENUM ('LEAD', 'CONTATO', 'PROPOSTA', 'NEGOCIACAO', 'FECHADO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadStatus') THEN
    CREATE TYPE "LeadStatus" AS ENUM ('ABERTO', 'GANHO', 'PERDIDO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActivityType') THEN
    CREATE TYPE "ActivityType" AS ENUM ('CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'VISIT', 'NOTE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadTaskStatus') THEN
    CREATE TYPE "LeadTaskStatus" AS ENUM ('OPEN', 'DONE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CrmProposalStatus') THEN
    CREATE TYPE "CrmProposalStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED');
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
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Lead_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LeadStageHistory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lead_id" UUID NOT NULL,
  "from_stage" "LeadStage",
  "to_stage" "LeadStage" NOT NULL,
  "changed_by" UUID NOT NULL,
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadStageHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeadStageHistory_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LeadActivity" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lead_id" UUID NOT NULL,
  "type" "ActivityType" NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeadActivity_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LeadTask" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lead_id" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "due_at" TIMESTAMP(3) NOT NULL,
  "reminder_at" TIMESTAMP(3),
  "status" "LeadTaskStatus" NOT NULL DEFAULT 'OPEN',
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeadTask_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LeadProposal" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lead_id" UUID NOT NULL,
  "status" "CrmProposalStatus" NOT NULL DEFAULT 'DRAFT',
  "value" DECIMAL(12,2),
  "description" TEXT,
  "sent_at" TIMESTAMP(3),
  "file_url" TEXT,
  "file_name" TEXT,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadProposal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeadProposal_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LeadAttachment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lead_id" UUID,
  "url" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "mime_type" TEXT,
  "uploaded_by" UUID NOT NULL,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeadAttachment_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AgendaItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "task_id" UUID,
  "lead_id" UUID,
  "title" TEXT NOT NULL,
  "date_time" TIMESTAMP(3) NOT NULL,
  "status" "LeadTaskStatus" NOT NULL DEFAULT 'OPEN',
  "source" TEXT NOT NULL DEFAULT 'LEAD_TASK',
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgendaItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AgendaItem_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "LeadTask"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AgendaItem_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgendaItem_task_id_key" ON "AgendaItem"("task_id");
CREATE INDEX IF NOT EXISTS "Lead_owner_id_idx" ON "Lead"("owner_id");
CREATE INDEX IF NOT EXISTS "Lead_stage_idx" ON "Lead"("stage");
CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status");
CREATE INDEX IF NOT EXISTS "Lead_updated_at_idx" ON "Lead"("updated_at");
CREATE INDEX IF NOT EXISTS "LeadStageHistory_lead_id_idx" ON "LeadStageHistory"("lead_id");
CREATE INDEX IF NOT EXISTS "LeadStageHistory_changed_at_idx" ON "LeadStageHistory"("changed_at");
CREATE INDEX IF NOT EXISTS "LeadActivity_lead_id_idx" ON "LeadActivity"("lead_id");
CREATE INDEX IF NOT EXISTS "LeadActivity_created_at_idx" ON "LeadActivity"("created_at");
CREATE INDEX IF NOT EXISTS "LeadTask_lead_id_idx" ON "LeadTask"("lead_id");
CREATE INDEX IF NOT EXISTS "LeadTask_due_at_idx" ON "LeadTask"("due_at");
CREATE INDEX IF NOT EXISTS "LeadProposal_lead_id_idx" ON "LeadProposal"("lead_id");
CREATE INDEX IF NOT EXISTS "LeadProposal_status_idx" ON "LeadProposal"("status");
CREATE INDEX IF NOT EXISTS "LeadAttachment_lead_id_idx" ON "LeadAttachment"("lead_id");
CREATE INDEX IF NOT EXISTS "AgendaItem_lead_id_idx" ON "AgendaItem"("lead_id");
CREATE INDEX IF NOT EXISTS "AgendaItem_date_time_idx" ON "AgendaItem"("date_time");
