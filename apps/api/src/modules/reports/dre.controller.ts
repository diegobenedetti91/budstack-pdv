import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { DreService } from './dre.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TenantId } from '../../common/decorators/tenant.decorator'

@ApiTags('DRE / Relatórios Financeiros')
@Controller('reports/dre')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DreController {
  constructor(private readonly dreService: DreService) {}

  @Get('summary')
  async getSummary(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dreService.getDreSummary(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    )
  }

  @Get('products')
  async getByProduct(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dreService.getDreByProduct(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    )
  }

  @Get('daily')
  async getDaily(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dreService.getDreDaily(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    )
  }
}
