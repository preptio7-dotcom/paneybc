-- Ensure one page_view event per (post/session/day) to reduce duplicate analytics noise.
-- post_id can be NULL for blog listing views, so COALESCE is used for deterministic keying.
CREATE UNIQUE INDEX IF NOT EXISTS "blog_analytics_page_view_dedupe_idx"
ON "blog_analytics_events" (COALESCE("post_id", '__listing__'), "session_id", (DATE("created_at")))
WHERE "event_type" = 'page_view';
