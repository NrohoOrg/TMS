-- Collapse the Priority enum to just ('normal', 'urgent'). Existing tasks
-- with low/high have been remapped to normal at the application layer.

ALTER TYPE "Priority" RENAME TO "Priority_old";
CREATE TYPE "Priority" AS ENUM ('normal', 'urgent');

ALTER TABLE "Task"
  ALTER COLUMN "priority" DROP DEFAULT,
  ALTER COLUMN "priority" TYPE "Priority" USING "priority"::text::"Priority",
  ALTER COLUMN "priority" SET DEFAULT 'normal';

DROP TYPE "Priority_old";
