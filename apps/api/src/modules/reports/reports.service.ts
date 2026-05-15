import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(tenantId: string, from: Date, to: Date) {
    const [orders, payments, topProducts, hourlyRevenue] = await Promise.all([
      // Resumo de pedidos
      this.prisma.order.findMany({
        where: { tenantId, createdAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } },
        select: { id: true, total: true, status: true, createdAt: true, type: true },
      }),

      // Pagamentos aprovados
      this.prisma.payment.findMany({
        where: { order: { tenantId }, createdAt: { gte: from, lte: to }, status: 'APPROVED' },
        select: { method: true, amount: true },
      }),

      // Produtos mais pedidos
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { tenantId, createdAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } }, status: { not: 'CANCELLED' } },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),

      // Receita por hora
      this.prisma.$queryRaw<Array<{ hour: number; revenue: number }>>`
        SELECT EXTRACT(HOUR FROM o."createdAt") as hour,
               SUM(o.total)::float as revenue
        FROM "Order" o
        WHERE o."tenantId" = ${tenantId}
          AND o."createdAt" >= ${from}
          AND o."createdAt" <= ${to}
          AND o.status != 'CANCELLED'
        GROUP BY hour
        ORDER BY hour
      `,
    ])

    const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total), 0)
    const closedOrders = orders.filter((o) => o.status === 'CLOSED').length
    const avgTicket = closedOrders > 0 ? totalRevenue / closedOrders : 0

    // Receita por método de pagamento
    const byMethod: Record<string, number> = {}
    payments.forEach((p) => {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + Number(p.amount)
    })

    // Produtos top — buscar nomes
    const productIds = topProducts.map((p) => p.productId)
    const productNames = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, imageUrl: true },
    })
    const nameMap = Object.fromEntries(productNames.map((p) => [p.id, p]))

    const topItems = topProducts.map((p) => ({
      productId: p.productId,
      name: nameMap[p.productId]?.name ?? 'Desconhecido',
      imageUrl: nameMap[p.productId]?.imageUrl,
      quantity: p._sum.quantity ?? 0,
      revenue: Number(p._sum.totalPrice ?? 0),
    }))

    // Pedidos por dia (últimos 7 dias)
    const dailyMap: Record<string, { orders: number; revenue: number }> = {}
    orders.forEach((o) => {
      const day = new Date(o.createdAt).toISOString().slice(0, 10)
      if (!dailyMap[day]) dailyMap[day] = { orders: 0, revenue: 0 }
      dailyMap[day].orders++
      dailyMap[day].revenue += Number(o.total)
    })
    const daily = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }))

    return {
      summary: {
        totalRevenue,
        totalOrders: orders.length,
        closedOrders,
        avgTicket,
        cancelledOrders: orders.filter((o) => o.status === 'CANCELLED').length,
      },
      byMethod,
      topItems,
      daily,
      hourly: (hourlyRevenue as any[]).map((h) => ({ hour: Number(h.hour), revenue: Number(h.revenue) })),
    }
  }
}
