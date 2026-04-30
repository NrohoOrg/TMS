-- AlterTable
ALTER TABLE "Config" ALTER COLUMN "co2GramsPerKm" SET DEFAULT 140,
ALTER COLUMN "fuelLPer100Km" SET DEFAULT 6,
ALTER COLUMN "dieselPricePerLiterDZD" SET DEFAULT 47;

-- RenameIndex (idempotent: this drift-fix migration can sort before
-- add_route_matrix_cache by timestamp, so on fresh databases the old index
-- doesn't exist yet — skip silently in that case).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'RouteMatrixCache_route_matrix_pair_key'
  ) THEN
    EXECUTE 'ALTER INDEX "RouteMatrixCache_route_matrix_pair_key" RENAME TO "RouteMatrixCache_fromLat_fromLng_toLat_toLng_key"';
  END IF;
END
$$;
