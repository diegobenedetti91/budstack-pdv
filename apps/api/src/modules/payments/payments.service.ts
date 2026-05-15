import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PaymentMethod } from '@budstack/types'

export class CreatePaymentDto {
  method: PaymentMethod
  amount: number
  cashReceived?: number
}

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async addPayment(tenantId: string, orderId: string, dto: CreatePaymentDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { payments: true },
    })
    if (!order) throw new BadRequestException('Pedido não encontrado')
    if (order.status === 'CLOSED') throw new BadRequestException('Pedido já fechado')

    const alreadyPaid = order.payments
      .filter((p) => p.status === 'APPROVED')
      .reduce((acc, p) => acc + Number(p.amount), 0)

    const remaining = Number(order.total) - alreadyPaid
    if (dto.amount > remaining + 0.01) {
      throw new BadRequestException(`Valor excede o saldo restante de R$ ${remaining.toFixed(2)}`)
    }

    let change = 0
    if (dto.method === PaymentMethod.CASH && dto.cashReceived) {
      change = dto.cashReceived - dto.amount
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        method: dto.method,
        amount: dto.amount,
        status: 'APPROVED',
        cashReceived: dto.cashReceived,
        change: change > 0 ? change : null,
      },
    })

    // Verifica se o pedido foi totalmente pago
    const newPaid = alreadyPaid + dto.amount
    if (newPaid >= Number(order.total) - 0.01) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'CLOSED', closedAt: new Date() },
      })
      if (order.tableId) {
        await this.prisma.table.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' },
        })
      }
    }

    return payment
  }

  async getOrderPayments(tenantId: string, orderId: string) {
    return this.prisma.payment.findMany({
      where: { orderId, order: { tenantId } },
      orderBy: { createdAt: 'asc' },
    })
  }
}
