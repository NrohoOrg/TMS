-- Persistent cache for road-routing matrix entries. Filled on cache miss
-- by the Google Distance Matrix provider and never expires.

CREATE TABLE "RouteMatrixCache" (
  "id"         TEXT             NOT NULL PRIMARY KEY,
  "fromLat"    DOUBLE PRECISION NOT NULL,
  "fromLng"    DOUBLE PRECISION NOT NULL,
  "toLat"      DOUBLE PRECISION NOT NULL,
  "toLng"      DOUBLE PRECISION NOT NULL,
  "distanceM"  INTEGER          NOT NULL,
  "durationS"  INTEGER          NOT NULL,
  "computedAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "RouteMatrixCache_route_matrix_pair_key"
  ON "RouteMatrixCache" ("fromLat", "fromLng", "toLat", "toLng");

CREATE INDEX "RouteMatrixCache_fromLat_fromLng_idx"
  ON "RouteMatrixCache" ("fromLat", "fromLng");
