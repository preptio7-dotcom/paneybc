-- Add chapter breakdown snapshot per mock session.
ALTER TABLE "BaeMockSession"
  ADD COLUMN "chapter_breakdown" JSONB;

-- Track users who want notifications when a mock test mode becomes available.
CREATE TABLE "mock_test_notify_requests" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "test_type" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mock_test_notify_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mock_test_notify_requests_user_id_test_type_key"
  ON "mock_test_notify_requests"("user_id", "test_type");

CREATE INDEX "mock_test_notify_requests_test_type_created_at_idx"
  ON "mock_test_notify_requests"("test_type", "created_at");
