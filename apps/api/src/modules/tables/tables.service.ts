import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'
import { PrismaService } from '../prisma/prisma.service'

export class CreateTableDto {
  @IsInt() @Min(1) number: number
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsInt() @Min(1) capacity?: number
  @IsOptional() @IsString() section?: string
}

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.table.findMany({
      where: { tenantId },
      orderBy: { number: 'asc' },
    })
  }

  async create(tenantId: string, dto: CreateTableDto) {
    const existing = await this.prisma.table.findUnique({
      where: { number_tenantId: { number: dto.number, tenantId } },
    })
    if (existing) throw new ConflictException(`Mesa ${dto.number} já existe`)
    return this.prisma.table.create({ data: { tenantId, ...dto } })
  }

  async update(tenantId: string, id: string, dto: Partial<CreateTableDto>) {
    await this.findOne(tenantId, id)
    return this.prisma.table.update({ where: { id }, data: dto })
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    await this.findOne(tenantId, id)
    return this.prisma.table.update({ where: { id }, data: { status: status as any } })
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id)
    return this.prisma.table.delete({ where: { id } })
  }

  private async findOne(tenantId: string, id: string) {
    const table = await this.prisma.table.findFirst({ where: { id, tenantId } })
    if (!table) throw new NotFoundException('Mesa não encontrada')
    return table
  }
}
