-- Load-balancing weight, in km-of-detour-per-task-of-imbalance.
-- The optimizer adds (loadBalancingKmPerTask × (maxTasksPerDriver - minTasksPerDriver))
-- to its objective so it prefers balanced routes when distance is comparable.

ALTER TABLE "Config"
  ADD COLUMN "loadBalancingKmPerTask" INTEGER NOT NULL DEFAULT 15;
