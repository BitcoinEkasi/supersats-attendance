ALTER TABLE "participants" ADD COLUMN "payment_method" TEXT NOT NULL DEFAULT 'BOLT_CARD';
ALTER TABLE "participants" ADD COLUMN "lightning_address" TEXT;
