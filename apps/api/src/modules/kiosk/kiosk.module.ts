import { Module } from '@nestjs/common'
import { KioskService } from './kiosk.service'
import { KioskController } from './kiosk.controller'
import { KitchenModule } from '../kitchen/kitchen.module'

@Module({
  imports: [KitchenModule],
  providers: [KioskService],
  controllers: [KioskController],
})
export class KioskModule {}
