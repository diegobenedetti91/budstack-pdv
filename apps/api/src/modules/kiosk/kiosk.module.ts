import { Module } from '@nestjs/common'
import { KioskService } from './kiosk.service'
import { KioskController } from './kiosk.controller'
import { KitchenModule } from '../kitchen/kitchen.module'
import { StockModule } from '../stock/stock.module'

@Module({
  imports: [KitchenModule, StockModule],
  providers: [KioskService],
  controllers: [KioskController],
})
export class KioskModule {}
