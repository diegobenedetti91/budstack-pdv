import { Module } from '@nestjs/common'
import { PrintersService } from './printers.service'
import { PrintersController } from './printers.controller'

@Module({ providers: [PrintersService], controllers: [PrintersController], exports: [PrintersService] })
export class PrintersModule {}
