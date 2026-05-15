import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.shift.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { openedAt: 'desc' },
      take: 30,
    })
  }

  async getCurrent(tenantId: string) {
    return this.prisma.shift.findFirst({
      where: { tenantId, closedAt: null },
      include: { user: { select: { id: true, name: true } } },
    })
  }

  async open(tenantId: string, userId: string, openingBalance: number, notes?: string) {
    const existing = await this.getCurrent(tenantId)
    if (existing) throw new BadRequestException('Já existe um turno aberto')

    return this.prisma.shift.create({
      data: { tenantId, userId, openingBalance, notes },
      include: { user: { select: { id: true, name: true } } },
    })
  }

  async close(tenantId: string, shiftId: string, closingBalance: number, notes?: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, tenantId, closedAt: null },
    })
    if (!shift) throw new NotFoundException('Turno não encontrado ou já fechado')

    // Calcula total de vendas no período
    const payments = await this.prisma.payment.findMany({
      where: {
        order: { tenantId },
        status: 'APPROVED',
        createdAt: { gte: shift.openedAt },
      },
      select: { method: true, amount: true },
    })

    const totalByMethod: Record<string, number> = {}
    payments.forEach((p) => {
      totalByMethod[p.method] = (totalByMethod[p.method] ?? 0) + Number(p.amount)
    })

    return this.prisma.shift.update({
      where: { id: shiftId },
      data: { closedAt: new Date(), closingBalance, notes: notes ?? shift.notes },
      include: { user: { select: { id: true, name: true } } },
    })
  }

  async getSummary(tenantId: string, shiftId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, tenantId },
      include: { user: { select: { id: true, name: true } } },
    })
    if (!shift) throw new NotFoundException('Turno não encontrado')

    const endTime = shift.closedAt ?? new Date()

    const payments = await this.prisma.payment.findMany({
      where: {
        order: { tenantId },
        status: 'APPROVED',
        createdAt: { gte: shift.openedAt, lte: endTime },
      },
      select: { method: true, amount: true },
    })

    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: shift.openedAt, lte: endTime },
        status: { not: 'CANCELLED' },
      },
      select: { id: true, status: true, total: true },
    })

    const totalByMethod: Record<string, number> = {}
    payments.forEach((p) => {
      totalByMethod[p.method] = (totalByMethod[p.method] ?? 0) + Number(p.amount)
    })

    return {
      shift,
      summary: {
        totalOrders: orders.length,
        closedOrders: orders.filter((o) => o.status === 'CLOSED').length,
        totalRevenue: payments.reduce((acc, p) => acc + Number(p.amount), 0),
        byMethod: totalByMethod,
        expectedBalance: Number(shift.openingBalance) + payments
          .filter((p) => p.method === 'CASH')
          .reduce((acc, p) => acc + Number(p.amount), 0),
      },
    }
  }
}
