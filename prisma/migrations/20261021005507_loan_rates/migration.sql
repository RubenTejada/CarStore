-- CreateTable
CREATE TABLE "LoanRate" (
    "lender" TEXT NOT NULL,
    "condition" "Condition" NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "tae" DOUBLE PRECISION,
    "effectiveDate" DATE,
    "sourceUrl" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanRate_pkey" PRIMARY KEY ("lender","condition")
);
