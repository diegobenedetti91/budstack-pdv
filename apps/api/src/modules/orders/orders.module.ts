import { Module } from '@nestjs/common'
import { OrdersService } from './orders.service'
import { OrdersController } from './orders.controller'
import { KitchenModule } from '../kitchen/kitchen.module'
import { WhatsappModule } from '../whatsapp/whatsapp.module'
import { PrintersModule } from '../printers/printers.module'
import { StockModule } from '../stock/stock.module'
import { CouponsModule } from '../coupons/coupons.module'

@Module({
  imports: [KitchenModule, WhatsappModule, PrintersModule, StockModule, CouponsModule],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
