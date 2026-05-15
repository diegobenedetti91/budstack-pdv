import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CategoriesService, CreateCategoryDto } from './categories.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TenantId } from '../../common/decorators/tenant.decorator'

@ApiTags('Categorias')
@Controller('categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get() findAll(@TenantId() tenantId: string) { return this.categoriesService.findAll(tenantId) }
  @Post() create(@TenantId() tenantId: string, @Body() dto: CreateCategoryDto) { return this.categoriesService.create(tenantId, dto) }
  @Patch(':id') update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>) { return this.categoriesService.update(tenantId, id, dto) }
  @Delete(':id') remove(@TenantId() tenantId: string, @Param('id') id: string) { return this.categoriesService.remove(tenantId, id) }
}
