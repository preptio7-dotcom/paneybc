-- Campaigns can now stay in progress across days when the daily SMTP quota is reached.
ALTER TYPE "EmailScheduleStatus" ADD VALUE IF NOT EXISTS 'in_progress';

CREATE TYPE "EmailRecipientStatus" AS ENUM ('pending', 'sent', 'failed');

-- One row per recipient per campaign. Records who was sent to, when, and who is still waiting.
CREATE TABLE "email_campaign_recipients" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" "EmailRecipientStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_campaign_recipients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_campaign_recipients_schedule_id_email_key" ON "email_campaign_recipients"("schedule_id", "email");
CREATE INDEX "email_campaign_recipients_schedule_id_status_idx" ON "email_campaign_recipients"("schedule_id", "status");
CREATE INDEX "email_campaign_recipients_status_sent_at_idx" ON "email_campaign_recipients"("status", "sent_at");

ALTER TABLE "email_campaign_recipients" ADD CONSTRAINT "email_campaign_recipients_schedule_id_fkey"
    FOREIGN KEY ("schedule_id") REFERENCES "EmailSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
