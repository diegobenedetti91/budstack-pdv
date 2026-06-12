import { Module } from '@nestjs/common'
import { StockService } from './stock.service'
import { StockController } from './stock.controller'
import { StockGateway } from './stock.gateway'

@Module({
  providers: [StockService, StockGateway],
  controllers: [StockController],
  exports: [StockService, StockGateway],
})
export class StockModule {}
