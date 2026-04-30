-- Master toggle for outbound SMS. Defaults to true to preserve current behaviour.
ALTER TABLE "Config" ADD COLUMN "smsEnabled" BOOLEAN NOT NULL DEFAULT true;
