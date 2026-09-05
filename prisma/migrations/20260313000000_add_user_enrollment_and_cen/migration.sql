-- CreateEnum
CREATE TYPE "EnrollmentType" AS ENUM ('institute', 'self_study');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "enrollmentType" "EnrollmentType" NOT NULL DEFAULT 'institute',
ADD COLUMN "cenNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_cenNumber_key" ON "User"("cenNumber");
