-- AlterTable
ALTER TABLE "blocked_ips" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ip_activity_log" ADD COLUMN     "attempted_email" VARCHAR(255),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "whitelisted_ips" ALTER COLUMN "updated_at" DROP DEFAULT;
