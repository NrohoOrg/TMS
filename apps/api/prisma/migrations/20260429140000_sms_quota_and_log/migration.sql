-- SMS daily quota + audit log.
ALTER TABLE "Config"
  ADD COLUMN "smsDailyLimit" INTEGER NOT NULL DEFAULT 50;

CREATE TABLE "SmsLog" (
  "id"               TEXT PRIMARY KEY,
  "destination"      TEXT NOT NULL,
  "success"          BOOLEAN NOT NULL,
  "providerCode"     TEXT,
  "providerResponse" TEXT,
  "sentAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "SmsLog_sentAt_idx" ON "SmsLog"("sentAt");
