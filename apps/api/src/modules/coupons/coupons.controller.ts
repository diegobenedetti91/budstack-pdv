import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CouponsService, CreateCouponDto } from './coupons.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TenantId } from '../../common/decorators/tenant.decorator'

@ApiTags('Cupons')
@Controller('coupons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar cupom' })
  create(@TenantId() tenantId: string, @Body() dto: CreateCouponDto) {
    return this.couponsService.create(tenantId, dto)
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os cupons' })
  findAll(@TenantId() tenantId: string) {
    return this.couponsService.findAll(tenantId)
  }

  @Get('active')
  @ApiOperation({ summary: 'Listar cupons ativos' })
  findActive(@TenantId() tenantId: string) {
    return this.couponsService.findActive(tenantId)
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validar cupom (sem usar)' })
  validate(@TenantId() tenantId: string, @Body() { code, orderTotal }: { code: string; orderTotal: number }) {
    return this.couponsService.validate(tenantId, code, orderTotal)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar cupom' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateCouponDto>) {
    return this.couponsService.update(tenantId, id, dto)
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Ativar/desativar cupom' })
  toggle(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.couponsService.toggle(tenantId, id)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar cupom' })
  delete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.couponsService.delete(tenantId, id)
  }
}
