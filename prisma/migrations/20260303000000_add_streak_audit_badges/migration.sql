DO $$
BEGIN
  CREATE TYPE "StreakAuditActionType" AS ENUM (
    'increment',
    'reset',
    'no_change',
    'first_time',
    'reconciliation_reset'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "UserBadgeType" AS ENUM (
    'week_warrior',
    'fortnight_fighter',
    'monthly_master',
    'centurion'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "streak_audit_log" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "credited_date" TIMESTAMP(3) NOT NULL,
  "credited" BOOLEAN NOT NULL,
  "action_type" "StreakAuditActionType" NOT NULL,
  "streak_before" INTEGER NOT NULL DEFAULT 0,
  "streak_after" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "streak_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_badges" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "badge_type" "UserBadgeType" NOT NULL,
  "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "seen" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'streak_audit_log_user_id_fkey'
      AND table_name = 'streak_audit_log'
  ) THEN
    ALTER TABLE "streak_audit_log"
      ADD CONSTRAINT "streak_audit_log_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'user_badges_user_id_fkey'
      AND table_name = 'user_badges'
  ) THEN
    ALTER TABLE "user_badges"
      ADD CONSTRAINT "user_badges_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'user_badges_user_id_badge_type_key'
      AND table_name = 'user_badges'
  ) THEN
    ALTER TABLE "user_badges"
      ADD CONSTRAINT "user_badges_user_id_badge_type_key"
      UNIQUE ("user_id", "badge_type");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "streak_audit_log_user_id_idx" ON "streak_audit_log"("user_id");
CREATE INDEX IF NOT EXISTS "streak_audit_log_user_id_credited_date_idx" ON "streak_audit_log"("user_id", "credited_date");
CREATE INDEX IF NOT EXISTS "streak_audit_log_created_at_idx" ON "streak_audit_log"("created_at");
CREATE INDEX IF NOT EXISTS "streak_audit_log_action_type_created_at_idx" ON "streak_audit_log"("action_type", "created_at");

CREATE INDEX IF NOT EXISTS "user_badges_user_id_idx" ON "user_badges"("user_id");
CREATE INDEX IF NOT EXISTS "user_badges_seen_created_at_idx" ON "user_badges"("seen", "created_at");
