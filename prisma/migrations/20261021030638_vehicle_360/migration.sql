-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "interiorPano" TEXT,
ADD COLUMN     "spinFrames" TEXT[] DEFAULT ARRAY[]::TEXT[];
