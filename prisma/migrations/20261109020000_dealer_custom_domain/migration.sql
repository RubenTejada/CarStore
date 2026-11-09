-- AlterTable
ALTER TABLE "Dealer" ADD COLUMN "customDomain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Dealer_customDomain_key" ON "Dealer"("customDomain");
