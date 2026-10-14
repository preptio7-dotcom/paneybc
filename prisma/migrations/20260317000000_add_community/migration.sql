CREATE TYPE "CommunityVoteTargetType" AS ENUM ('thread', 'comment');
CREATE TYPE "CommunityReportTargetType" AS ENUM ('thread', 'comment');
CREATE TYPE "CommunityReportStatus" AS ENUM ('open', 'reviewed', 'resolved');
CREATE TYPE "CommunityModerationActionType" AS ENUM ('delete', 'lock', 'unlock', 'restore');
CREATE TYPE "CommunityModerationTargetType" AS ENUM ('thread', 'comment');

CREATE TABLE "community_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "community_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "community_categories_slug_key" ON "community_categories"("slug");
CREATE INDEX "community_categories_display_order_idx" ON "community_categories"("display_order");
ALTER TABLE "community_categories" ADD CONSTRAINT "community_categories_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "community_threads" (
  "id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "edited_at" TIMESTAMP(3),
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "community_threads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "community_threads_category_id_created_at_idx" ON "community_threads"("category_id", "created_at");
CREATE INDEX "community_threads_created_at_idx" ON "community_threads"("created_at");
CREATE INDEX "community_threads_deleted_locked_idx" ON "community_threads"("deleted", "locked");
ALTER TABLE "community_threads" ADD CONSTRAINT "community_threads_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "community_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "community_threads" ADD CONSTRAINT "community_threads_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "community_comments" (
  "id" TEXT NOT NULL,
  "thread_id" TEXT NOT NULL,
  "parent_comment_id" TEXT,
  "author_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "edited_at" TIMESTAMP(3),
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "community_comments_thread_id_created_at_idx" ON "community_comments"("thread_id", "created_at");
CREATE INDEX "community_comments_parent_comment_id_created_at_idx" ON "community_comments"("parent_comment_id", "created_at");
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "community_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "community_votes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "target_type" "CommunityVoteTargetType" NOT NULL,
  "target_id" TEXT NOT NULL,
  "value" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "community_votes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_votes_value_check" CHECK ("value" IN (-1, 1))
);
CREATE UNIQUE INDEX "community_votes_user_id_target_type_target_id_key" ON "community_votes"("user_id", "target_type", "target_id");
CREATE INDEX "community_votes_target_type_target_id_idx" ON "community_votes"("target_type", "target_id");
ALTER TABLE "community_votes" ADD CONSTRAINT "community_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "community_reports" (
  "id" TEXT NOT NULL,
  "target_type" "CommunityReportTargetType" NOT NULL,
  "target_id" TEXT NOT NULL,
  "reporter_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "CommunityReportStatus" NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "community_reports_status_created_at_idx" ON "community_reports"("status", "created_at");
CREATE INDEX "community_reports_target_type_target_id_idx" ON "community_reports"("target_type", "target_id");
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "community_moderation_actions" (
  "id" TEXT NOT NULL,
  "actor_id" TEXT NOT NULL,
  "action_type" "CommunityModerationActionType" NOT NULL,
  "target_type" "CommunityModerationTargetType" NOT NULL,
  "target_id" TEXT NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_moderation_actions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "community_moderation_actions_created_at_idx" ON "community_moderation_actions"("created_at");
CREATE INDEX "community_moderation_actions_target_type_target_id_idx" ON "community_moderation_actions"("target_type", "target_id");
ALTER TABLE "community_moderation_actions" ADD CONSTRAINT "community_moderation_actions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "community_categories" ("id", "name", "slug", "description", "display_order", "updated_at") VALUES
  ('community-accounting', 'Accounting', 'accounting', 'Discuss concepts, adjustments, and exam strategy.', 1, CURRENT_TIMESTAMP),
  ('community-business-law', 'Business Law', 'business-law', 'Share questions and explanations for Business Law.', 2, CURRENT_TIMESTAMP),
  ('community-quantitative-methods', 'Quantitative Methods', 'quantitative-methods', 'Work through maths, statistics, and quantitative methods.', 3, CURRENT_TIMESTAMP),
  ('community-business-economics', 'Business Economics', 'business-economics', 'Talk economics concepts, applications, and revision.', 4, CURRENT_TIMESTAMP),
  ('community-general', 'General Discussion', 'general', 'Study routines, exam planning, and community conversation.', 5, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
