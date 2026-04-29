-- OR objective overhaul: switch arc cost from rounded km to integer
-- micro-DZD (fuel + time), surface fuel/time/penalty knobs as Config rows,
-- and align fuel defaults with the new Hyundai Accent fleet (6 L/100km,
-- 47 DZD/L petrol). Existing column dieselPricePerLiterDZD is repurposed
-- to hold the petrol price in DZD/L; renaming would break the impact API.

ALTER TABLE "Config"
  ADD COLUMN "dropoffServiceMinutesDefault" INTEGER          NOT NULL DEFAULT 5,
  ADD COLUMN "timeCostDzdPerHour"           DOUBLE PRECISION NOT NULL DEFAULT 70,
  ADD COLUMN "unassignedPenaltyNormalDzd"   INTEGER          NOT NULL DEFAULT 100000,
  ADD COLUMN "unassignedPenaltyUrgentDzd"   INTEGER          NOT NULL DEFAULT 1000000;

-- Refresh impact / fuel defaults on the singleton Config row. Keep any
-- existing user customisation by only touching fields that still match the
-- legacy out-of-the-box values.
UPDATE "Config"
SET "fuelLPer100Km"          = 6
WHERE "id" = 1 AND "fuelLPer100Km" = 8;

UPDATE "Config"
SET "dieselPricePerLiterDZD" = 47
WHERE "id" = 1 AND "dieselPricePerLiterDZD" = 29;

UPDATE "Config"
SET "co2GramsPerKm"          = 140
WHERE "id" = 1 AND "co2GramsPerKm" = 171;
