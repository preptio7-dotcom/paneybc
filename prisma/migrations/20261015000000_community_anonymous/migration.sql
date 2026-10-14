-- Add anonymous posting support to community threads and comments

-- AlterTable: community_threads
ALTER TABLE "community_threads" ADD COLUMN "is_anonymous" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: community_comments
ALTER TABLE "community_comments" ADD COLUMN "is_anonymous" BOOLEAN NOT NULL DEFAULT false;
