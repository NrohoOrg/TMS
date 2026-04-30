-- AlterTable
ALTER TABLE "Config" ALTER COLUMN "co2GramsPerKm" SET DEFAULT 140,
ALTER COLUMN "fuelLPer100Km" SET DEFAULT 6,
ALTER COLUMN "dieselPricePerLiterDZD" SET DEFAULT 47;

-- RenameIndex
ALTER INDEX "RouteMatrixCache_route_matrix_pair_key" RENAME TO "RouteMatrixCache_fromLat_fromLng_toLat_toLng_key";
