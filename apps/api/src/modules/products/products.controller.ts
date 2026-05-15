import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ProductsService, CreateProductDto, CreateVariationDto } from './products.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TenantId } from '../../common/decorators/tenant.decorator'

@ApiTags('Produtos')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query('categoryId') categoryId?: string) {
    return this.productsService.findAll(tenantId, categoryId)
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.productsService.findOne(tenantId, id)
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(tenantId, dto)
  }

  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.productsService.update(tenantId, id, dto)
  }

  @Patch(':id/toggle')
  toggle(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.productsService.toggleAvailability(tenantId, id)
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.productsService.remove(tenantId, id)
  }

  // ── Variações ────────────────────────────────────────────────────────────

  @Get(':id/variations')
  @ApiOperation({ summary: 'Listar variações do produto' })
  findVariations(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.productsService.findVariations(tenantId, id)
  }

  @Post(':id/variations')
  @ApiOperation({ summary: 'Criar variação (ex: tamanho, adicional)' })
  createVariation(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateVariationDto,
  ) {
    return this.productsService.createVariation(tenantId, id, dto)
  }

  @Patch(':id/variations/:varId')
  updateVariation(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('varId') varId: string,
    @Body() dto: Partial<CreateVariationDto>,
  ) {
    return this.productsService.updateVariation(tenantId, id, varId, dto)
  }

  @Delete(':id/variations/:varId')
  removeVariation(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('varId') varId: string,
  ) {
    return this.productsService.removeVariation(tenantId, id, varId)
  }
}
