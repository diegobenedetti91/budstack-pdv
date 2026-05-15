import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ShiftsService } from './shifts.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TenantId } from '../../common/decorators/tenant.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('Turno de Caixa')
@Controller('shifts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  @ApiOperation({ summary: 'Histórico de turnos' })
  findAll(@TenantId() tenantId: string) {
    return this.shiftsService.findAll(tenantId)
  }

  @Get('current')
  @ApiOperation({ summary: 'Turno aberto atual' })
  getCurrent(@TenantId() tenantId: string) {
    return this.shiftsService.getCurrent(tenantId)
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Resumo financeiro de um turno' })
  getSummary(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.shiftsService.getSummary(tenantId, id)
  }

  @Post('open')
  @ApiOperation({ summary: 'Abrir turno de caixa' })
  open(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: { openingBalance: number; notes?: string },
  ) {
    return this.shiftsService.open(tenantId, user.id, body.openingBalance, body.notes)
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Fechar turno de caixa' })
  close(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { closingBalance: number; notes?: string },
  ) {
    return this.shiftsService.close(tenantId, id, body.closingBalance, body.notes)
  }
}
