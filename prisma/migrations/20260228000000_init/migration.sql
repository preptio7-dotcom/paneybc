-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('student', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "StudentRole" AS ENUM ('user', 'ambassador', 'paid', 'unpaid');

-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('new', 'read', 'replied');

-- CreateEnum
CREATE TYPE "EmailTemplateCategory" AS ENUM ('onboarding', 'engagement', 'reengagement', 'exam_prep', 'general');

-- CreateEnum
CREATE TYPE "EmailTemplateStatus" AS ENUM ('draft', 'active');

-- CreateEnum
CREATE TYPE "EmailSegment" AS ENUM ('new_users', 'active_users', 'inactive_users', 'exam_prep', 'all_users');

-- CreateEnum
CREATE TYPE "EmailScheduleStatus" AS ENUM ('scheduled', 'sent', 'cancelled');

-- CreateEnum
CREATE TYPE "JoinUsStatus" AS ENUM ('new', 'reviewed', 'replied');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('completed', 'processing', 'failed');

-- CreateEnum
CREATE TYPE "QuestionReportStatus" AS ENUM ('open', 'reviewed', 'resolved');

-- CreateEnum
CREATE TYPE "FinancialStatementInputType" AS ENUM ('dropdown', 'manual');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'student',
    "studentRole" "StudentRole" NOT NULL DEFAULT 'unpaid',
    "avatar" TEXT NOT NULL DEFAULT '/avatars/boy_1.png',
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "adminOtpFailedAttempts" INTEGER NOT NULL DEFAULT 0,
    "degree" TEXT NOT NULL DEFAULT '',
    "level" TEXT NOT NULL DEFAULT '',
    "institute" TEXT,
    "city" TEXT,
    "studentId" TEXT,
    "phone" TEXT,
    "instituteRating" INTEGER,
    "termsAcceptedAt" TIMESTAMP(3),
    "examName" TEXT NOT NULL DEFAULT '',
    "examDate" TIMESTAMP(3),
    "dailyQuestionGoal" INTEGER NOT NULL DEFAULT 0,
    "prepChecklist" JSONB,
    "resetPasswordToken" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "chapters" JSONB,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'processing',
    "count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "chapter" TEXT,
    "questionNumber" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "imageUrl" TEXT,
    "options" TEXT[],
    "correctAnswer" INTEGER,
    "correctAnswers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "maxSelections" INTEGER NOT NULL DEFAULT 2,
    "explanation" TEXT NOT NULL,
    "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'medium',
    "uploadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "subject" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "wrongAnswers" INTEGER NOT NULL DEFAULT 0,
    "notAttempted" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "weightedScore" DOUBLE PRECISION,
    "weightedTotal" DOUBLE PRECISION,
    "weightedPercent" DOUBLE PRECISION,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "answers" JSONB,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analytics" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "userAgent" TEXT,
    "screenResolution" TEXT,
    "ip" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'new',
    "reply" TEXT,
    "replyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EmailTemplateCategory" NOT NULL DEFAULT 'general',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "EmailTemplateStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSchedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "segment" "EmailSegment" NOT NULL,
    "sendAt" TIMESTAMP(3) NOT NULL,
    "status" "EmailScheduleStatus" NOT NULL DEFAULT 'scheduled',
    "sentAt" TIMESTAMP(3),
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "newWithinDays" INTEGER NOT NULL DEFAULT 1,
    "activeWithinDays" INTEGER NOT NULL DEFAULT 7,
    "inactiveDays" INTEGER NOT NULL DEFAULT 14,
    "examDaysBefore" INTEGER NOT NULL DEFAULT 30,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT,
    "chapter" TEXT,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT,
    "chapter" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Otp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'super_admin',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "subscription" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JoinUsRequest" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "institute" TEXT,
    "role" TEXT,
    "experience" TEXT,
    "message" TEXT,
    "status" "JoinUsStatus" NOT NULL DEFAULT 'new',
    "adminReply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JoinUsRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "stageIndex" INTEGER NOT NULL DEFAULT 0,
    "correctStreak" INTEGER NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "lastReviewedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewNotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionReport" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL DEFAULT '',
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT,
    "questionNumber" INTEGER,
    "reason" TEXT NOT NULL,
    "status" "QuestionReportStatus" NOT NULL DEFAULT 'open',
    "adminReply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "focusMode" TEXT NOT NULL DEFAULT 'pomodoro',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "isMaintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "adsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "welcomeMessageTemplate" TEXT NOT NULL DEFAULT 'Welcome back, {{name}}!',
    "adContent" JSONB,
    "testSettings" JSONB,
    "toggledBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialStatementCase" (
    "id" SERIAL NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "trialBalancePdfUrl" TEXT NOT NULL,
    "additionalInfo" TEXT,
    "defaultTimeLimit" INTEGER NOT NULL DEFAULT 45,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showThousandsNote" BOOLEAN NOT NULL DEFAULT false,
    "totalMarks" DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialStatementCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SociLineItem" (
    "id" SERIAL NOT NULL,
    "caseId" INTEGER NOT NULL,
    "heading" TEXT NOT NULL,
    "inputType" "FinancialStatementInputType" NOT NULL DEFAULT 'dropdown',
    "dropdownOptions" JSONB NOT NULL,
    "correctValue" TEXT NOT NULL,
    "marks" DECIMAL(5,2) NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SociLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SofpLineItem" (
    "id" SERIAL NOT NULL,
    "caseId" INTEGER NOT NULL,
    "heading" TEXT NOT NULL,
    "inputType" "FinancialStatementInputType" NOT NULL DEFAULT 'dropdown',
    "groupLabel" TEXT,
    "dropdownOptions" JSONB NOT NULL,
    "correctValue" TEXT NOT NULL,
    "marks" DECIMAL(5,2) NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SofpLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialStatementAttempt" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" INTEGER NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "sociAnswers" JSONB NOT NULL,
    "sofpAnswers" JSONB NOT NULL,
    "totalMarksObtained" DECIMAL(5,2) NOT NULL,
    "totalMarks" DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    "percentageScore" DECIMAL(5,2) NOT NULL,
    "timeSpent" INTEGER NOT NULL,
    "timeLimitSet" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialStatementAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFsProgress" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "bestScore" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "casesCompleted" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFsProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialStatementReport" (
    "id" TEXT NOT NULL,
    "caseId" INTEGER NOT NULL,
    "lineItemId" INTEGER,
    "section" TEXT NOT NULL,
    "heading" TEXT,
    "caseNumber" TEXT,
    "caseTitle" TEXT,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "QuestionReportStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialStatementReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewSchedule_userId_questionId_key" ON "ReviewSchedule"("userId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewNotificationLog_userId_key" ON "ReviewNotificationLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialStatementCase_caseNumber_key" ON "FinancialStatementCase"("caseNumber");

-- CreateIndex
CREATE INDEX "SociLineItem_caseId_idx" ON "SociLineItem"("caseId");

-- CreateIndex
CREATE INDEX "SociLineItem_displayOrder_idx" ON "SociLineItem"("displayOrder");

-- CreateIndex
CREATE INDEX "SofpLineItem_caseId_idx" ON "SofpLineItem"("caseId");

-- CreateIndex
CREATE INDEX "SofpLineItem_displayOrder_idx" ON "SofpLineItem"("displayOrder");

-- CreateIndex
CREATE INDEX "FinancialStatementAttempt_userId_idx" ON "FinancialStatementAttempt"("userId");

-- CreateIndex
CREATE INDEX "FinancialStatementAttempt_caseId_idx" ON "FinancialStatementAttempt"("caseId");

-- CreateIndex
CREATE INDEX "FinancialStatementAttempt_submittedAt_idx" ON "FinancialStatementAttempt"("submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserFsProgress_userId_key" ON "UserFsProgress"("userId");

-- CreateIndex
CREATE INDEX "FinancialStatementReport_caseId_idx" ON "FinancialStatementReport"("caseId");

-- CreateIndex
CREATE INDEX "FinancialStatementReport_status_idx" ON "FinancialStatementReport"("status");

-- CreateIndex
CREATE INDEX "FinancialStatementReport_userId_idx" ON "FinancialStatementReport"("userId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorId_createdAt_idx" ON "AdminAuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "EmailSchedule" ADD CONSTRAINT "EmailSchedule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SociLineItem" ADD CONSTRAINT "SociLineItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "FinancialStatementCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SofpLineItem" ADD CONSTRAINT "SofpLineItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "FinancialStatementCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialStatementAttempt" ADD CONSTRAINT "FinancialStatementAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialStatementAttempt" ADD CONSTRAINT "FinancialStatementAttempt_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "FinancialStatementCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFsProgress" ADD CONSTRAINT "UserFsProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialStatementReport" ADD CONSTRAINT "FinancialStatementReport_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "FinancialStatementCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialStatementReport" ADD CONSTRAINT "FinancialStatementReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

