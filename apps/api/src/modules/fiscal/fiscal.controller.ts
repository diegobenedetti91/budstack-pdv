import { Controller, Post, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { FiscalService } from './fiscal.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TenantId } from '../../common/decorators/tenant.decorator'

@ApiTags('Fiscal')
@Controller('fiscal')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  @Post('orders/:id/nfce')
  @ApiOperation({ summary: 'Emitir NFC-e para um pedido' })
  emitNfce(@TenantId() tenantId: string, @Param('id') orderId: string) {
    return this.fiscalService.emitNfce(tenantId, orderId)
  }

  @Post('orders/:id/sat')
  @ApiOperation({ summary: 'Emitir SAT para um pedido' })
  emitSat(@TenantId() tenantId: string, @Param('id') orderId: string) {
    return this.fiscalService.emitSat(tenantId, orderId)
  }
}
