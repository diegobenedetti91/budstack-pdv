import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(tenantId: string, from: Date, to: Date) {

    const [orders, payments, topProducts, hourlyRevenue, costByProduct] = await Promise.all([
      this.prisma.order.findMany({
        where: { tenantId, createdAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } },
        select: { id: true, total: true, status: true, createdAt: true, type: true },
      }),

      this.prisma.payment.findMany({
        where: { order: { tenantId }, createdAt: { gte: from, lte: to }, status: 'APPROVED' },
        select: { method: true, amount: true },
      }),

      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: { tenantId, createdAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } },
          status: { not: 'CANCELLED' },
        },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),

      this.prisma.$queryRaw<Array<{ hour: number; revenue: number }>>`
        SELECT HOUR(o.createdAt) as hour,
               CAST(SUM(o.total) AS DECIMAL(10,2)) as revenue
        FROM Order o
        WHERE o.tenantId = ${tenantId}
          AND o.createdAt >= ${from}
          AND o.createdAt <= ${to}
          AND o.status != 'CANCELLED'
        GROUP BY hour
        ORDER BY hour
      `,

      // Custo agregado por produto (sem trazer todos os itens)
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: { tenantId, createdAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } },
          status: { not: 'CANCELLED' },
        },
        _sum: { quantity: true },
      }),
    ])

    const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total), 0)
    const closedOrders = orders.filter((o) => o.status === 'CLOSED').length
    const avgTicket = closedOrders > 0 ? totalRevenue / closedOrders : 0

    // Busca os preços de custo dos produtos top
    const productIds = costByProduct.map((p) => p.productId)
    const productCosts = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, costPrice: true },
    })
    const costMap = Object.fromEntries(productCosts.map((p) => [p.id, Number(p.costPrice ?? 0)]))

    // Custo total e margem bruta (usando agregação)
    const totalCost = costByProduct.reduce((acc, item) => {
      const costPrice = costMap[item.productId] ?? 0
      return acc + costPrice * (item._sum.quantity ?? 0)
    }, 0)
    const grossProfit = totalRevenue - totalCost
    const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

    // Receita por método de pagamento
    const byMethod: Record<string, number> = {}
    payments.forEach((p) => {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + Number(p.amount)
    })

    // Produtos top — nomes + custo
    const topProductIds = topProducts.map((p) => p.productId)
    const productData = await this.prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, imageUrl: true, costPrice: true },
    })
    const productMap = Object.fromEntries(productData.map((p) => [p.id, p]))

    const topItems = topProducts.map((p) => {
      const product = productMap[p.productId]
      const revenue = Number(p._sum.totalPrice ?? 0)
      const quantity = p._sum.quantity ?? 0
      const costPrice = Number(product?.costPrice ?? 0)
      const cost = costPrice * quantity
      const profit = revenue - cost
      const marginPercent = revenue > 0 && costPrice > 0 ? (profit / revenue) * 100 : null
      return {
        productId: p.productId,
        name: product?.name ?? 'Desconhecido',
        imageUrl: product?.imageUrl ?? null,
        quantity,
        revenue,
        cost,
        profit,
        marginPercent,
      }
    })

    // Pedidos por dia
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
        totalCost,
        grossProfit,
        grossMarginPercent,
      },
      byMethod,
      topItems,
      daily,
      hourly: (hourlyRevenue as any[]).map((h) => ({ hour: Number(h.hour), revenue: Number(h.revenue) })),
    }
  }
}
