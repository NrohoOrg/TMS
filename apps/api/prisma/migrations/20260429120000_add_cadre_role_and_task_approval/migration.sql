-- CreateEnum
CREATE TYPE "TaskApprovalStatus" AS ENUM ('pending_approval', 'approved', 'rejected');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'CADRE';

-- AlterTable
ALTER TABLE "Task"
  ADD COLUMN "approvalStatus" "TaskApprovalStatus" NOT NULL DEFAULT 'approved',
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "decidedAt" TIMESTAMP(3),
  ADD COLUMN "decidedById" TEXT;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
