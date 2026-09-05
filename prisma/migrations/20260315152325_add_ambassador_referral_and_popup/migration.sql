/*
  Warnings:

  - A unique constraint covering the columns `[referralCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "popupDismissed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referralLink" TEXT;

-- CreateTable
CREATE TABLE "ReferralSignup" (
    "id" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "newUserId" TEXT NOT NULL,
    "newUserName" TEXT NOT NULL,
    "newUserEmail" TEXT NOT NULL,
    "signedUpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "page" TEXT,

    CONSTRAINT "ReferralSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralSignup_newUserId_key" ON "ReferralSignup"("newUserId");

-- CreateIndex
CREATE INDEX "ReferralSignup_referralCode_idx" ON "ReferralSignup"("referralCode");

-- CreateIndex
CREATE INDEX "ReferralSignup_referrerId_idx" ON "ReferralSignup"("referrerId");

-- CreateIndex
CREATE INDEX "ReferralSignup_signedUpAt_idx" ON "ReferralSignup"("signedUpAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "ReferralSignup" ADD CONSTRAINT "ReferralSignup_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralSignup" ADD CONSTRAINT "ReferralSignup_newUserId_fkey" FOREIGN KEY ("newUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
