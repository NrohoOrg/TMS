-- Vehicle info captured per driver (1 vehicle per driver in this fleet).
ALTER TABLE "Driver" ADD COLUMN "vehicleName" TEXT;
ALTER TABLE "Driver" ADD COLUMN "vehiclePlate" TEXT;
