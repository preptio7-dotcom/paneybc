-- Consent timestamp on memberships. NULL means the student has not consented,
-- so the institute cannot see their results yet.
ALTER TABLE "organization_memberships" ADD COLUMN "consented_at" TIMESTAMP(3);

-- Invitations sent by an institute. Only a hash of the token is stored.
CREATE TABLE "organization_invites" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'member',
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_invites_token_hash_key" ON "organization_invites"("token_hash");
CREATE UNIQUE INDEX "organization_invites_org_id_email_key" ON "organization_invites"("org_id", "email");
CREATE INDEX "organization_invites_org_id_idx" ON "organization_invites"("org_id");
CREATE INDEX "organization_invites_expires_at_idx" ON "organization_invites"("expires_at");

ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
