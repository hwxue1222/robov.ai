ALTER TABLE "Store" ADD COLUMN "number" SERIAL NOT NULL;
ALTER TABLE "Merchant" ADD COLUMN "number" SERIAL NOT NULL;
CREATE UNIQUE INDEX "Store_number_key" ON "Store"("number");
CREATE UNIQUE INDEX "Merchant_number_key" ON "Merchant"("number");
