-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TRANSFER', 'PAYONEER_LINK');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "chargeUsdCents" INTEGER,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'TRANSFER';
