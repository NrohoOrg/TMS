-- Impact / KPI constants used by the dispatcher impact endpoint to translate
-- km saved into CO2 / fuel / cost figures. Tunable per-deployment.
ALTER TABLE "Config"
  ADD COLUMN "co2GramsPerKm"          INTEGER NOT NULL DEFAULT 171,
  ADD COLUMN "fuelLPer100Km"          DOUBLE PRECISION NOT NULL DEFAULT 8,
  ADD COLUMN "dieselPricePerLiterDZD" INTEGER NOT NULL DEFAULT 29;
