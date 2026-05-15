import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PrinterType, PrinterDestination } from '@budstack/types'

export class CreatePrinterDto {
  name: string
  type: PrinterType
  ipAddress?: string
  port?: number
  usbPath?: string
  destination: PrinterDestination
  isDefault?: boolean
}

@Injectable()
export class PrintersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.printer.findMany({ where: { tenantId }, orderBy: { name: 'asc' } })
  }

  async create(tenantId: string, dto: CreatePrinterDto) {
    if (dto.isDefault) {
      await this.prisma.printer.updateMany({ where: { tenantId }, data: { isDefault: false } })
    }
    return this.prisma.printer.create({ data: { tenantId, ...dto } })
  }

  async update(tenantId: string, id: string, dto: Partial<CreatePrinterDto>) {
    await this.findOne(tenantId, id)
    if (dto.isDefault) {
      await this.prisma.printer.updateMany({ where: { tenantId }, data: { isDefault: false } })
    }
    return this.prisma.printer.update({ where: { id }, data: dto })
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id)
    return this.prisma.printer.delete({ where: { id } })
  }

  private async findOne(tenantId: string, id: string) {
    const printer = await this.prisma.printer.findFirst({ where: { id, tenantId } })
    if (!printer) throw new NotFoundException('Impressora não encontrada')
    return printer
  }
}
