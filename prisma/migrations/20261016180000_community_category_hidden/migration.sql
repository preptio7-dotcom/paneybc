-- Hidden subjects/tags: kept in the database, removed from public lists and feeds.
ALTER TABLE "community_categories" ADD COLUMN "is_hidden" BOOLEAN NOT NULL DEFAULT false;
