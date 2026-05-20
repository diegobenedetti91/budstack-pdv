import { Module } from '@nestjs/common'
import { PrintersService } from './printers.service'
import { PrintersController } from './printers.controller'
import { PrintService } from './print.service'

@Module({
  providers: [PrintersService, PrintService],
  controllers: [PrintersController],
  exports: [PrintersService, PrintService],
})
export class PrintersModule {}
