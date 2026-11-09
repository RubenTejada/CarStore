-- CreateEnum
CREATE TYPE "SocialNetwork" AS ENUM ('FACEBOOK', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "socialModule" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SocialAccount" (
    "dealerId" TEXT NOT NULL,
    "pageId" TEXT,
    "pageName" TEXT,
    "pageToken" TEXT,
    "igUserId" TEXT,
    "igUsername" TEXT,
    "pendingPages" TEXT,
    "connectedAt" TIMESTAMP(3),
    "needsReconnect" BOOLEAN NOT NULL DEFAULT false,
    "autoPublish" BOOLEAN NOT NULL DEFAULT true,
    "publishFacebook" BOOLEAN NOT NULL DEFAULT true,
    "publishInstagram" BOOLEAN NOT NULL DEFAULT true,
    "defaultDesign" JSONB,
    "captionTemplate" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("dealerId")
);

-- CreateTable
CREATE TABLE "SocialAd" (
    "vehicleId" TEXT NOT NULL,
    "design" JSONB NOT NULL,
    "caption" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAd_pkey" PRIMARY KEY ("vehicleId")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "network" "SocialNetwork" NOT NULL,
    "status" "SocialPostStatus" NOT NULL DEFAULT 'PENDING',
    "format" TEXT NOT NULL,
    "story" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "remoteId" TEXT,
    "permalink" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "reach" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "metricsAt" TIMESTAMP(3),

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialVisit" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "network" "SocialNetwork" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialPost_dealerId_createdAt_idx" ON "SocialPost"("dealerId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialPost_vehicleId_createdAt_idx" ON "SocialPost"("vehicleId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialPost_status_metricsAt_idx" ON "SocialPost"("status", "metricsAt");

-- CreateIndex
CREATE INDEX "SocialVisit_vehicleId_createdAt_idx" ON "SocialVisit"("vehicleId", "createdAt");

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAd" ADD CONSTRAINT "SocialAd_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialVisit" ADD CONSTRAINT "SocialVisit_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

