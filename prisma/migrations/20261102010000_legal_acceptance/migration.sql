ALTER TABLE "User" ALTER COLUMN "alertsEnabled" SET DEFAULT false;
ALTER TABLE "User" ADD COLUMN "legalVersion" TEXT;

-- El valor anterior venía activado por defecto: no acredita una elección voluntaria.
-- Se requiere volver a activarlo desde la cuenta; no se inventan consentimientos históricos.
UPDATE "User" SET "alertsEnabled" = false WHERE "alertsEnabled" = true;

CREATE TABLE "LegalAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "subjectId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LegalAcceptance_userId_kind_idx" ON "LegalAcceptance"("userId", "kind");
CREATE INDEX "LegalAcceptance_subjectId_kind_idx" ON "LegalAcceptance"("subjectId", "kind");
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "LegalRequest" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reference" TEXT,
    "message" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    CONSTRAINT "LegalRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LegalRequest_reviewedAt_createdAt_idx" ON "LegalRequest"("reviewedAt", "createdAt");
