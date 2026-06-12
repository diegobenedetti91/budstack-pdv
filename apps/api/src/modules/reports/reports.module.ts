import { Module } from '@nestjs/common'
import { ReportsService } from './reports.service'
import { ReportsController } from './reports.controller'
import { DreService } from './dre.service'
import { DreController } from './dre.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  providers: [ReportsService, DreService],
  controllers: [ReportsController, DreController],
})
export class ReportsModule {}
