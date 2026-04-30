-- Carpool / shared-trip support: collapse service time at clustered stops.
-- When the optimizer visits the same coordinates back-to-back, every
-- intermediate stop is charged this marginal cost instead of the full
-- pickup/dropoff service time, and the full service is paid once when
-- the driver leaves the cluster.

ALTER TABLE "Config"
  ADD COLUMN "colocatedMarginalServiceSeconds" INTEGER NOT NULL DEFAULT 60;
