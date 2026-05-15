import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CompaniesService } from './companies.service'
import { UpsertCompanyDto } from './dto/upsert-company.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TenantId } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { UserRole } from '@budstack/types'

@ApiTags('Empresa')
@Controller('company')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Buscar configurações da empresa' })
  findOne(@TenantId() tenantId: string) {
    return this.companiesService.findByTenant(tenantId)
  }

  @Put()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Salvar/atualizar configurações da empresa' })
  upsert(@TenantId() tenantId: string, @Body() dto: UpsertCompanyDto) {
    return this.companiesService.upsert(tenantId, dto)
  }
}
