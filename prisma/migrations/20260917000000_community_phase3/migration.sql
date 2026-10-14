-- CreateEnum
CREATE TYPE "CommunityPostType" AS ENUM ('question', 'discussion', 'resource', 'exam_advice');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CommunityModerationActionType" ADD VALUE 'pin';
ALTER TYPE "CommunityModerationActionType" ADD VALUE 'unpin';

-- AlterTable
ALTER TABLE "community_threads" ADD COLUMN     "accepted_comment_id" TEXT,
ADD COLUMN     "pinned_at" TIMESTAMP(3),
ADD COLUMN     "post_type" "CommunityPostType" NOT NULL DEFAULT 'discussion',
ADD COLUMN     "solved_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "community_bookmarks" (
    "user_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_bookmarks_pkey" PRIMARY KEY ("user_id","thread_id")
);

-- CreateTable
CREATE TABLE "community_follows" (
    "user_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_follows_pkey" PRIMARY KEY ("user_id","thread_id")
);

-- CreateTable
CREATE TABLE "community_preferences" (
    "user_id" TEXT NOT NULL,
    "replies" BOOLEAN NOT NULL DEFAULT true,
    "followed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "community_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "community_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_bookmarks_user_id_created_at_idx" ON "community_bookmarks"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "community_bookmarks_thread_id_idx" ON "community_bookmarks"("thread_id");

-- CreateIndex
CREATE INDEX "community_follows_thread_id_idx" ON "community_follows"("thread_id");

-- CreateIndex
CREATE INDEX "community_notifications_user_id_read_at_created_at_idx" ON "community_notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "community_notifications_thread_id_idx" ON "community_notifications"("thread_id");

-- CreateIndex
CREATE INDEX "community_notifications_actor_id_idx" ON "community_notifications"("actor_id");

-- CreateIndex
CREATE INDEX "community_notifications_comment_id_idx" ON "community_notifications"("comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_notifications_user_id_comment_id_kind_key" ON "community_notifications"("user_id", "comment_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "community_threads_accepted_comment_id_key" ON "community_threads"("accepted_comment_id");

-- AddForeignKey
ALTER TABLE "community_threads" ADD CONSTRAINT "community_threads_accepted_comment_id_fkey" FOREIGN KEY ("accepted_comment_id") REFERENCES "community_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_bookmarks" ADD CONSTRAINT "community_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_bookmarks" ADD CONSTRAINT "community_bookmarks_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "community_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_follows" ADD CONSTRAINT "community_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_follows" ADD CONSTRAINT "community_follows_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "community_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_preferences" ADD CONSTRAINT "community_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_notifications" ADD CONSTRAINT "community_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_notifications" ADD CONSTRAINT "community_notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_notifications" ADD CONSTRAINT "community_notifications_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "community_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_notifications" ADD CONSTRAINT "community_notifications_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX community_threads_search_idx ON community_threads USING GIN (to_tsvector('simple', title || ' ' || body));
CREATE INDEX community_threads_questions_idx ON community_threads(post_type, solved_at, created_at) WHERE deleted = false;
