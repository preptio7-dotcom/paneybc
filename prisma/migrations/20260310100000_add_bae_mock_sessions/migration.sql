-- Create table for combined BAE mock test sessions (Vol I + Vol II).
CREATE TABLE "BaeMockSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "testType" TEXT NOT NULL DEFAULT 'bae_mock',
  "subjectIds" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "totalQuestions" INTEGER NOT NULL,
  "timeAllowed" INTEGER NOT NULL,
  "timeTaken" INTEGER,
  "vol1Count" INTEGER NOT NULL,
  "vol2Count" INTEGER NOT NULL,
  "vol1Correct" INTEGER NOT NULL DEFAULT 0,
  "vol2Correct" INTEGER NOT NULL DEFAULT 0,
  "correctAnswers" INTEGER NOT NULL DEFAULT 0,
  "wrongAnswers" INTEGER NOT NULL DEFAULT 0,
  "notAttempted" INTEGER NOT NULL DEFAULT 0,
  "scorePercent" INTEGER NOT NULL DEFAULT 0,
  "questionSet" JSONB NOT NULL,
  "answers" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BaeMockSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BaeMockSession_userId_completed_createdAt_idx"
  ON "BaeMockSession"("userId", "completed", "createdAt");

CREATE INDEX "BaeMockSession_testType_completed_createdAt_idx"
  ON "BaeMockSession"("testType", "completed", "createdAt");
