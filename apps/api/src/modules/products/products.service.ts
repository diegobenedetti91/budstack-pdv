import { Injectable, NotFoundException } from '@nestjs/common'
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { PrismaService } from '../prisma/prisma.service'

export class CreateProductDto {
  @IsString() categoryId: string
  @IsString() name: string
  @IsOptional() @IsString() description?: string
  @IsNumber() @Min(0) price: number
  @IsOptional() @IsNumber() @Min(0) costPrice?: number
  @IsOptional() @IsString() imageUrl?: string
  @IsOptional() @IsString() code?: string
  @IsOptional() @IsBoolean() isAvailable?: boolean
  @IsOptional() @IsString() printerId?: string
  @IsOptional() @IsBoolean() stockControl?: boolean
  @IsOptional() @IsNumber() @Min(0) stockQuantity?: number
  @IsOptional() @IsNumber() @Min(0) stockMinimum?: number
}

export class CreateVariationDto {
  @IsString() name: string
  @IsNumber() @Min(0) price: number
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, categoryId?: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true, ...(categoryId && { categoryId }) },
      include: { category: true, variations: { where: { isActive: true } } },
      orderBy: { name: 'asc' },
    })

    // Filtrar produtos sem estoque (se controle de estoque está ativo)
    return products.filter(p => {
      if (!p.stockControl) return true // Produto sem controle de estoque, sempre disponível
      return p.stockQuantity > 0 // Com controle, só retorna se tem estoque
    })
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: { category: true, variations: { where: { isActive: true } } },
    })
    if (!product) throw new NotFoundException('Produto não encontrado')
    return product
  }

  async create(tenantId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: { tenantId, ...dto },
      include: { category: true },
    })
  }

  async update(tenantId: string, id: string, dto: Partial<CreateProductDto>) {
    await this.findOne(tenantId, id)
    return this.prisma.product.update({ where: { id }, data: dto, include: { category: true } })
  }

  async toggleAvailability(tenantId: string, id: string) {
    const product = await this.findOne(tenantId, id)
    return this.prisma.product.update({
      where: { id },
      data: { isAvailable: !product.isAvailable },
    })
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id)
    return this.prisma.product.update({ where: { id }, data: { isActive: false } })
  }

  // ── Variações ────────────────────────────────────────────────────────────

  async findVariations(tenantId: string, productId: string) {
    await this.findOne(tenantId, productId)
    return this.prisma.productVariation.findMany({
      where: { productId, isActive: true },
      orderBy: { name: 'asc' },
    })
  }

  async createVariation(tenantId: string, productId: string, dto: CreateVariationDto) {
    await this.findOne(tenantId, productId)
    return this.prisma.productVariation.create({ data: { productId, ...dto } })
  }

  async updateVariation(tenantId: string, productId: string, varId: string, dto: Partial<CreateVariationDto>) {
    await this.findOne(tenantId, productId)
    const variation = await this.prisma.productVariation.findFirst({ where: { id: varId, productId } })
    if (!variation) throw new NotFoundException('Variação não encontrada')
    return this.prisma.productVariation.update({ where: { id: varId }, data: dto })
  }

  async removeVariation(tenantId: string, productId: string, varId: string) {
    await this.findOne(tenantId, productId)
    const variation = await this.prisma.productVariation.findFirst({ where: { id: varId, productId } })
    if (!variation) throw new NotFoundException('Variação não encontrada')
    return this.prisma.productVariation.update({ where: { id: varId }, data: { isActive: false } })
  }
}
