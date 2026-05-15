import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { TablesService, CreateTableDto } from './tables.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TenantId } from '../../common/decorators/tenant.decorator'

@ApiTags('Mesas')
@Controller('tables')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get() findAll(@TenantId() tenantId: string) { return this.tablesService.findAll(tenantId) }
  @Post() create(@TenantId() tenantId: string, @Body() dto: CreateTableDto) { return this.tablesService.create(tenantId, dto) }
  @Patch(':id') update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateTableDto>) { return this.tablesService.update(tenantId, id, dto) }
  @Patch(':id/status') updateStatus(@TenantId() tenantId: string, @Param('id') id: string, @Body('status') status: string) { return this.tablesService.updateStatus(tenantId, id, status) }
  @Delete(':id') remove(@TenantId() tenantId: string, @Param('id') id: string) { return this.tablesService.remove(tenantId, id) }
}
