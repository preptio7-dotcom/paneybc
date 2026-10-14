-- Deep analytics support tables + performance indexes.

-- Add analytics indexes for faster range and subject queries.
CREATE INDEX IF NOT EXISTS "Question_subject_chapter_idx"
ON "Question"("subject", "chapter");

CREATE INDEX IF NOT EXISTS "TestResult_userId_createdAt_idx"
ON "TestResult"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "TestResult_userId_subject_createdAt_idx"
ON "TestResult"("userId", "subject", "createdAt");

-- Cache of daily anonymized platform averages (used by comparison widgets).
CREATE TABLE IF NOT EXISTS "platform_stats_daily" (
  "id" TEXT NOT NULL,
  "day_key" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'PKT',
  "period_start" TIMESTAMP(3) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL,
  "user_count" INTEGER NOT NULL DEFAULT 0,
  "total_tests" INTEGER NOT NULL DEFAULT 0,
  "total_questions" INTEGER NOT NULL DEFAULT 0,
  "overall_accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "avg_questions_per_day" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "avg_streak" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "avg_time_per_question" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "subject_averages" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_stats_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_stats_daily_day_key_key"
ON "platform_stats_daily"("day_key");

CREATE INDEX IF NOT EXISTS "platform_stats_daily_period_start_idx"
ON "platform_stats_daily"("period_start");

-- Cached recommendation payloads per user/range (1-hour TTL).
CREATE TABLE IF NOT EXISTS "user_recommendations" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "range_key" TEXT NOT NULL DEFAULT 'all',
  "recommendations" JSONB NOT NULL,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_recommendations_user_id_range_key_key"
ON "user_recommendations"("user_id", "range_key");

CREATE INDEX IF NOT EXISTS "user_recommendations_expires_at_idx"
ON "user_recommendations"("expires_at");

CREATE INDEX IF NOT EXISTS "user_recommendations_user_id_expires_at_idx"
ON "user_recommendations"("user_id", "expires_at");
