-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('pending', 'approved');

-- AlterTable
ALTER TABLE "UserFeedback"
ADD COLUMN "status" "FeedbackStatus" NOT NULL DEFAULT 'pending';

-- CreateIndex
CREATE INDEX "UserFeedback_status_createdAt_idx" ON "UserFeedback"("status", "createdAt");
