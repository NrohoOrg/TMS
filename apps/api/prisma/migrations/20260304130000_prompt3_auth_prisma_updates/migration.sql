-- AlterEnum
ALTER TYPE "StopStatus" ADD VALUE IF NOT EXISTS 'arrived';
ALTER TYPE "StopStatus" ADD VALUE IF NOT EXISTS 'done';
ALTER TYPE "StopStatus" ADD VALUE IF NOT EXISTS 'skipped';

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "name" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "lastLogin" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Stop"
ADD COLUMN "actualArrivalS" INTEGER,
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "notes" TEXT;

-- AlterTable
ALTER TABLE "Plan"
ADD COLUMN "publishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StopEvent" (
    "id" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "status" "StopStatus" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "StopEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StopEvent" ADD CONSTRAINT "StopEvent_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
