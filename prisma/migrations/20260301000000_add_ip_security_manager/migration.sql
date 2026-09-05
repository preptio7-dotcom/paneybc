-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "SecurityActivityType" AS ENUM (
    'failed_login',
    'brute_force_attempt',
    'too_many_requests',
    'account_lockout',
    'csrf_violation',
    'xss_attempt'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "SecurityEventStatus" AS ENUM (
    'active_threat',
    'suspicious',
    'resolved',
    'blocked'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "IpBlockSource" AS ENUM (
    'auto',
    'admin'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ip_activity_log" (
  "id" TEXT NOT NULL,
  "ip_address" TEXT NOT NULL,
  "activity_type" "SecurityActivityType" NOT NULL,
  "target_user_id" TEXT,
  "target_endpoint" TEXT,
  "attempts_count" INTEGER NOT NULL DEFAULT 1,
  "first_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "SecurityEventStatus" NOT NULL DEFAULT 'suspicious',
  "is_reviewed" BOOLEAN NOT NULL DEFAULT false,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ip_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "blocked_ips" (
  "id" TEXT NOT NULL,
  "ip_address" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "blocked_by" TEXT NOT NULL,
  "blocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "block_source" "IpBlockSource" NOT NULL DEFAULT 'admin',
  "total_attempts_before_block" INTEGER NOT NULL DEFAULT 0,
  "is_subnet" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "blocked_ips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "whitelisted_ips" (
  "id" TEXT NOT NULL,
  "ip_address" TEXT NOT NULL,
  "label" TEXT,
  "added_by" TEXT NOT NULL,
  "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "whitelisted_ips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ip_security_audit" (
  "id" TEXT NOT NULL,
  "admin_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "ip_address" TEXT NOT NULL,
  "reason" TEXT,
  "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,

  CONSTRAINT "ip_security_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ip_activity_log_ip_address_idx" ON "ip_activity_log"("ip_address");
CREATE INDEX IF NOT EXISTS "ip_activity_log_created_at_idx" ON "ip_activity_log"("created_at");
CREATE INDEX IF NOT EXISTS "ip_activity_log_status_idx" ON "ip_activity_log"("status");
CREATE INDEX IF NOT EXISTS "ip_activity_log_activity_type_created_at_idx" ON "ip_activity_log"("activity_type", "created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "blocked_ips_ip_address_key" ON "blocked_ips"("ip_address");
CREATE INDEX IF NOT EXISTS "blocked_ips_ip_address_idx" ON "blocked_ips"("ip_address");
CREATE INDEX IF NOT EXISTS "blocked_ips_blocked_at_idx" ON "blocked_ips"("blocked_at");
CREATE INDEX IF NOT EXISTS "blocked_ips_is_active_blocked_at_idx" ON "blocked_ips"("is_active", "blocked_at");
CREATE INDEX IF NOT EXISTS "blocked_ips_created_at_idx" ON "blocked_ips"("created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "whitelisted_ips_ip_address_key" ON "whitelisted_ips"("ip_address");
CREATE INDEX IF NOT EXISTS "whitelisted_ips_ip_address_idx" ON "whitelisted_ips"("ip_address");
CREATE INDEX IF NOT EXISTS "whitelisted_ips_added_at_idx" ON "whitelisted_ips"("added_at");
CREATE INDEX IF NOT EXISTS "whitelisted_ips_created_at_idx" ON "whitelisted_ips"("created_at");

CREATE INDEX IF NOT EXISTS "ip_security_audit_ip_address_idx" ON "ip_security_audit"("ip_address");
CREATE INDEX IF NOT EXISTS "ip_security_audit_performed_at_idx" ON "ip_security_audit"("performed_at");
CREATE INDEX IF NOT EXISTS "ip_security_audit_admin_id_performed_at_idx" ON "ip_security_audit"("admin_id", "performed_at");
CREATE INDEX IF NOT EXISTS "ip_security_audit_created_at_idx" ON "ip_security_audit"("created_at");
