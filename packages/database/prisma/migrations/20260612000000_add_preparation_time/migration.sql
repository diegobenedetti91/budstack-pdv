-- AddColumn preparationTimeMinutes to Product
ALTER TABLE "Product" ADD COLUMN "preparationTimeMinutes" INTEGER NOT NULL DEFAULT 5;
