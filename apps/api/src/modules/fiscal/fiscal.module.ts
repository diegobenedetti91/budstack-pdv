import { Module } from '@nestjs/common'
import { FiscalService } from './fiscal.service'
import { FiscalController } from './fiscal.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [FiscalController],
  providers: [FiscalService],
  exports: [FiscalService],
})
export class FiscalModule {}
