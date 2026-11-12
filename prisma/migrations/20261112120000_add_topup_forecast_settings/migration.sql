-- CreateTable
CREATE TABLE "topup_forecast_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "remaining_sessions" INTEGER NOT NULL DEFAULT 5,
    "contingency_percent" INTEGER NOT NULL DEFAULT 5,
    "topup_address" TEXT NOT NULL DEFAULT 'skredit@blink.sv',
    "last_sent_month" TEXT,
    "updated_at" DATETIME NOT NULL,
    "updated_by" TEXT
);

