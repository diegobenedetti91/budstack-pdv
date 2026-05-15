import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UpsertCompanyDto } from './dto/upsert-company.dto'

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async findByTenant(tenantId: string) {
    const company = await this.prisma.company.findUnique({ where: { tenantId } })
    if (!company) throw new NotFoundException('Configurações da empresa não encontradas')
    return company
  }

  async upsert(tenantId: string, dto: UpsertCompanyDto) {
    return this.prisma.company.upsert({
      where: { tenantId },
      update: dto,
      create: { tenantId, ...dto },
    })
  }
}
