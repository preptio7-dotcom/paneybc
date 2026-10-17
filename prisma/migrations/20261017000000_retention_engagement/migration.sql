-- Retention tooling: a "never practised" audience, an activation drip log and
-- a push frequency-cap log.

-- Audience: users who signed up but never attempted a practice test.
ALTER TYPE "EmailSegment" ADD VALUE IF NOT EXISTS 'never_practiced';

-- One row per activation step a user has been sent (or skipped). Guarantees the
-- Day 0/1/3/7 sequence is never sent twice to the same person.
CREATE TABLE "activation_email_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "error" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activation_email_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "activation_email_logs_user_id_step_key" ON "activation_email_logs"("user_id", "step");
CREATE INDEX "activation_email_logs_status_sent_at_idx" ON "activation_email_logs"("status", "sent_at");

-- One row per (user, kind, day). Acts as a hard frequency cap for re-engagement
-- pushes such as the "streak about to break" reminder.
CREATE TABLE "push_notification_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "day_key" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_notification_logs_user_id_kind_day_key_key" ON "push_notification_logs"("user_id", "kind", "day_key");
CREATE INDEX "push_notification_logs_kind_sent_at_idx" ON "push_notification_logs"("kind", "sent_at");
