-- CreateEnum
CREATE TYPE "BlogPostVisibility" AS ENUM ('public', 'beta');

-- AlterTable
ALTER TABLE "blog_posts" ADD COLUMN "visibility" "BlogPostVisibility";
UPDATE "blog_posts" SET "visibility" = 'public' WHERE "visibility" IS NULL;
ALTER TABLE "blog_posts" ALTER COLUMN "visibility" SET DEFAULT 'beta';
ALTER TABLE "blog_posts" ALTER COLUMN "visibility" SET NOT NULL;

-- CreateEnum
CREATE TYPE "BlogRevisionSaveType" AS ENUM ('manual_save', 'publish', 'status_change', 'pre_restore_snapshot');

-- CreateTable
CREATE TABLE "blog_revisions" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" VARCHAR(300) NOT NULL,
    "cover_image_url" TEXT,
    "saved_by" TEXT NOT NULL,
    "save_type" "BlogRevisionSaveType" NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_posts_visibility_idx" ON "blog_posts"("visibility");

-- CreateIndex
CREATE INDEX "blog_revisions_post_id_created_at_idx" ON "blog_revisions"("post_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "blog_revisions_post_id_revision_number_key" ON "blog_revisions"("post_id", "revision_number");

-- AddForeignKey
ALTER TABLE "blog_revisions" ADD CONSTRAINT "blog_revisions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;