import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      include: { company: true },
    })
    if (!tenant) throw new NotFoundException('Restaurante não encontrado')
    return tenant
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { company: true },
    })
    if (!tenant) throw new NotFoundException('Restaurante não encontrado')
    return tenant
  }
}
