-- AlterEnum
ALTER TYPE "BlogRevisionSaveType" ADD VALUE IF NOT EXISTS 'scheduled_publish';

-- CreateEnum
CREATE TYPE "BlogAnalyticsEventType" AS ENUM ('page_view', 'read_complete', 'cta_click', 'share_click', 'signup_from_blog');

-- CreateEnum
CREATE TYPE "BlogCtaPosition" AS ENUM ('mid_article', 'end_article');

-- CreateEnum
CREATE TYPE "BlogSharePlatform" AS ENUM ('whatsapp', 'facebook', 'copy');

-- CreateEnum
CREATE TYPE "BlogReferrerSource" AS ENUM ('google', 'whatsapp', 'facebook', 'direct', 'other');

-- AlterTable
ALTER TABLE "blog_posts"
ADD COLUMN "related_subjects" JSONB,
ADD COLUMN "scheduled_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "blog_cta_clicks" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "subject_code" TEXT NOT NULL,
    "cta_position" "BlogCtaPosition" NOT NULL,
    "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "session_id" TEXT NOT NULL,
    CONSTRAINT "blog_cta_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_analytics_events" (
    "id" TEXT NOT NULL,
    "post_id" TEXT,
    "event_type" "BlogAnalyticsEventType" NOT NULL,
    "subject_code" TEXT,
    "cta_position" "BlogCtaPosition",
    "share_platform" "BlogSharePlatform",
    "user_id" TEXT,
    "session_id" TEXT NOT NULL,
    "referrer_source" "BlogReferrerSource" NOT NULL DEFAULT 'other',
    "time_on_page" INTEGER,
    "scroll_depth" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blog_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_posts_scheduled_at_idx" ON "blog_posts"("scheduled_at");

-- CreateIndex
CREATE INDEX "blog_cta_clicks_post_id_idx" ON "blog_cta_clicks"("post_id");
CREATE INDEX "blog_cta_clicks_subject_code_idx" ON "blog_cta_clicks"("subject_code");
CREATE INDEX "blog_cta_clicks_clicked_at_idx" ON "blog_cta_clicks"("clicked_at");
CREATE INDEX "blog_cta_clicks_session_id_idx" ON "blog_cta_clicks"("session_id");

-- CreateIndex
CREATE INDEX "blog_analytics_events_post_id_idx" ON "blog_analytics_events"("post_id");
CREATE INDEX "blog_analytics_events_event_type_idx" ON "blog_analytics_events"("event_type");
CREATE INDEX "blog_analytics_events_created_at_idx" ON "blog_analytics_events"("created_at");
CREATE INDEX "blog_analytics_events_session_id_idx" ON "blog_analytics_events"("session_id");
CREATE INDEX "blog_analytics_events_post_id_created_at_idx" ON "blog_analytics_events"("post_id", "created_at");

-- AddForeignKey
ALTER TABLE "blog_cta_clicks"
ADD CONSTRAINT "blog_cta_clicks_post_id_fkey"
FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "blog_analytics_events"
ADD CONSTRAINT "blog_analytics_events_post_id_fkey"
FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
