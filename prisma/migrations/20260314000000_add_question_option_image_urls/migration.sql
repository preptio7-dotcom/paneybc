ALTER TABLE "Question"
ADD COLUMN "optionImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Question"
SET "optionImageUrls" = ARRAY[]::TEXT[]
WHERE "optionImageUrls" IS NULL;

ALTER TABLE "Question"
ALTER COLUMN "optionImageUrls" SET NOT NULL;
