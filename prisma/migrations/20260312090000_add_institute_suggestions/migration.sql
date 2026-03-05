CREATE TYPE "InstituteSuggestionStatus" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "institute_suggestions" (
    "id" TEXT NOT NULL,
    "suggested_name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "status" "InstituteSuggestionStatus" NOT NULL DEFAULT 'pending',
    "requested_by_user_id" TEXT,
    "requested_by_email" TEXT,
    "requested_by_name" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 1,
    "reviewed_by" TEXT,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institute_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "institute_suggestions_normalized_name_key" ON "institute_suggestions"("normalized_name");
CREATE INDEX "institute_suggestions_status_created_at_idx" ON "institute_suggestions"("status", "created_at");
CREATE INDEX "institute_suggestions_usage_count_idx" ON "institute_suggestions"("usage_count");
