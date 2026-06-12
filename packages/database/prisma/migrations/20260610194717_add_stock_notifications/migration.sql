-- CreateEnum
CREATE TYPE "StockNotificationType" AS ENUM ('BELOW_MINIMUM', 'OUT_OF_STOCK');

-- CreateTable
CREATE TABLE "StockNotification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "StockNotificationType" NOT NULL,
    "currentStock" INTEGER NOT NULL,
    "minimumStock" INTEGER NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockNotification_tenantId_isRead_idx" ON "StockNotification"("tenantId", "isRead");

-- CreateIndex
CREATE INDEX "StockNotification_productId_createdAt_idx" ON "StockNotification"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "Product_tenantId_stockControl_stockQuantity_idx" ON "Product"("tenantId", "stockControl", "stockQuantity");

-- AddForeignKey
ALTER TABLE "StockNotification" ADD CONSTRAINT "StockNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockNotification" ADD CONSTRAINT "StockNotification_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
