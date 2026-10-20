-- CreateTable
CREATE TABLE "ExchangeRate" (
    "day" DATE NOT NULL,
    "usdDop" DOUBLE PRECISION NOT NULL,
    "publishedOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("day")
);
