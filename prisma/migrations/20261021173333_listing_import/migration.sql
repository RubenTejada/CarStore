-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('DISCOVERING', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportItemStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'SKIPPED', 'FAILED');

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "sourceUrl" TEXT;

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'DISCOVERING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJobItem" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "ImportItemStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT,
    "error" TEXT,
    "vehicleId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJobItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportJob_dealerId_createdAt_idx" ON "ImportJob"("dealerId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportJobItem_jobId_status_idx" ON "ImportJobItem"("jobId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ImportJobItem_jobId_url_key" ON "ImportJobItem"("jobId", "url");

-- CreateIndex
CREATE INDEX "Vehicle_sourceUrl_idx" ON "Vehicle"("sourceUrl");

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJobItem" ADD CONSTRAINT "ImportJobItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
