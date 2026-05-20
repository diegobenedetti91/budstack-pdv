import { Module } from '@nestjs/common'
import { OrdersService } from './orders.service'
import { OrdersController } from './orders.controller'
import { KitchenModule } from '../kitchen/kitchen.module'
import { WhatsappModule } from '../whatsapp/whatsapp.module'
import { PrintersModule } from '../printers/printers.module'

@Module({
  imports: [KitchenModule, WhatsappModule, PrintersModule],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
