-- Catches up the migration history with previously-uncommitted schema changes:
--   * Plan: lastEditedAt, lastEditedById, notes
--   * Stop: locked, manuallyAssigned
--   * Route(planId, driverId) unique index
--   * Cascade behaviour on Route -> Plan and Stop -> Route
-- All ADDs are guarded with IF NOT EXISTS so the migration is idempotent for
-- environments where these were applied via `prisma db push` previously.

-- AlterTable: Plan
ALTER TABLE "Plan"
  ADD COLUMN IF NOT EXISTS "lastEditedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastEditedById" TEXT,
  ADD COLUMN IF NOT EXISTS "notes"          TEXT;

-- AlterTable: Stop
ALTER TABLE "Stop"
  ADD COLUMN IF NOT EXISTS "locked"           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "manuallyAssigned" BOOLEAN NOT NULL DEFAULT false;

-- Unique index on Route(planId, driverId).
CREATE UNIQUE INDEX IF NOT EXISTS "Route_planId_driverId_key"
  ON "Route" ("planId", "driverId");

-- Cascade FKs: drop existing then re-create with ON DELETE CASCADE.
ALTER TABLE "Route" DROP CONSTRAINT IF EXISTS "Route_planId_fkey";
ALTER TABLE "Route" ADD CONSTRAINT "Route_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Stop" DROP CONSTRAINT IF EXISTS "Stop_routeId_fkey";
ALTER TABLE "Stop" ADD CONSTRAINT "Stop_routeId_fkey"
  FOREIGN KEY ("routeId") REFERENCES "Route"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
