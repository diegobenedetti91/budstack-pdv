import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

export class CreateProductDto {
  categoryId: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  code?: string
  isAvailable?: boolean
  printerId?: string
}

export class CreateVariationDto {
  name: string
  price: number
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, categoryId?: string) {
    return this.prisma.product.findMany({
      where: { tenantId, isActive: true, ...(categoryId && { categoryId }) },
      include: { category: true, variations: { where: { isActive: true } } },
      orderBy: { name: 'asc' },
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
