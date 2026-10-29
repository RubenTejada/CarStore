-- CreateEnum
CREATE TYPE "LeadKind" AS ENUM ('WHATSAPP', 'CALL');

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "priceBefore" INTEGER,
ADD COLUMN     "priceDropAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PriceChange" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "oldPrice" INTEGER NOT NULL,
    "oldCurrency" "Currency" NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEvent" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "kind" "LeadKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceChange_vehicleId_createdAt_idx" ON "PriceChange"("vehicleId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadEvent_vehicleId_createdAt_idx" ON "LeadEvent"("vehicleId", "createdAt");

-- CreateIndex
CREATE INDEX "Vehicle_status_priceDropAt_idx" ON "Vehicle"("status", "priceDropAt");

-- AddForeignKey
ALTER TABLE "PriceChange" ADD CONSTRAINT "PriceChange_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
