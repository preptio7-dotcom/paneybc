-- CreateTable
CREATE TABLE "MockTestQuestionHistory" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "mockTestId" TEXT NOT NULL,
    "answeredCorrectly" BOOLEAN NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockTestQuestionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MockTestQuestionHistory_userId_questionId_idx" ON "MockTestQuestionHistory"("userId", "questionId");

-- CreateIndex
CREATE INDEX "MockTestQuestionHistory_userId_seenAt_idx" ON "MockTestQuestionHistory"("userId", "seenAt");

-- CreateIndex
CREATE UNIQUE INDEX "MockTestQuestionHistory_userId_questionId_mockTestId_key" ON "MockTestQuestionHistory"("userId", "questionId", "mockTestId");

-- AddForeignKey
ALTER TABLE "MockTestQuestionHistory" ADD CONSTRAINT "MockTestQuestionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockTestQuestionHistory" ADD CONSTRAINT "MockTestQuestionHistory_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
