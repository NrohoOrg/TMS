-- R5.2: Simplified Task form. Drops the explicit dropoff deadline and per-task
-- dropoff service time. Adds global Config defaults that the API uses to
-- derive pickupServiceMinutes and to bound dropoff timing relative to pickup.

ALTER TABLE "Task" DROP COLUMN "dropoffDeadline";
ALTER TABLE "Task" DROP COLUMN "dropoffServiceMinutes";

ALTER TABLE "Config" ADD COLUMN "pickupServiceMinutesDefault" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "Config" ADD COLUMN "dropoffWithinHours" INTEGER NOT NULL DEFAULT 2;
