import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { PrintersService, CreatePrinterDto } from './printers.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TenantId } from '../../common/decorators/tenant.decorator'

@ApiTags('Impressoras')
@Controller('printers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PrintersController {
  constructor(private readonly printersService: PrintersService) {}

  @Get() findAll(@TenantId() tenantId: string) { return this.printersService.findAll(tenantId) }
  @Post() create(@TenantId() tenantId: string, @Body() dto: CreatePrinterDto) { return this.printersService.create(tenantId, dto) }
  @Patch(':id') update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreatePrinterDto>) { return this.printersService.update(tenantId, id, dto) }
  @Delete(':id') remove(@TenantId() tenantId: string, @Param('id') id: string) { return this.printersService.remove(tenantId, id) }
}
