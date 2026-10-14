ALTER TABLE "avatar_packs"
ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'dicebear';

UPDATE "avatar_packs"
SET "source" = 'dicebear'
WHERE "source" IS NULL OR "source" = '';

CREATE INDEX IF NOT EXISTS "avatar_packs_source_idx" ON "avatar_packs"("source");
