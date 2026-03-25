ALTER TABLE "SystemSettings"
ADD COLUMN "active_avatar_pack_id" TEXT;

CREATE TABLE "avatar_packs" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "dicebear_style" TEXT NOT NULL,
  "variants_count" INTEGER NOT NULL DEFAULT 20,
  "seeds" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "avatar_packs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "avatar_packs_is_active_idx" ON "avatar_packs"("is_active");
CREATE INDEX "avatar_packs_created_at_idx" ON "avatar_packs"("created_at");

ALTER TABLE "SystemSettings"
ADD CONSTRAINT "SystemSettings_active_avatar_pack_id_fkey"
FOREIGN KEY ("active_avatar_pack_id") REFERENCES "avatar_packs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
