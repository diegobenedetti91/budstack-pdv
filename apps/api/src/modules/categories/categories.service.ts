import { Injectable, NotFoundException } from '@nestjs/common'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'
import { PrismaService } from '../prisma/prisma.service'

export class CreateCategoryDto {
  @IsString() name: string
  @IsOptional() @IsString() icon?: string
  @IsOptional() @IsString() imageUrl?: string
  @IsOptional() @IsInt() @Min(0) sortOrder?: number
}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { sortOrder: 'asc' },
    })
  }

  async create(tenantId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: { tenantId, ...dto } })
  }

  async update(tenantId: string, id: string, dto: Partial<CreateCategoryDto>) {
    await this.findOne(tenantId, id)
    return this.prisma.category.update({ where: { id }, data: dto })
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id)
    return this.prisma.category.update({ where: { id }, data: { isActive: false } })
  }

  private async findOne(tenantId: string, id: string) {
    const cat = await this.prisma.category.findFirst({ where: { id, tenantId } })
    if (!cat) throw new NotFoundException('Categoria não encontrada')
    return cat
  }
}
