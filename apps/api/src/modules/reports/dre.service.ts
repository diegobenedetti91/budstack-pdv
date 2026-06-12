import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class DreService {
  constructor(private prisma: PrismaService) {}

  async getDreSummary(tenantId: string, startDate: Date, endDate: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ['OPEN', 'IN_PROGRESS', 'CLOSED'] },
      },
      include: {
        items: { include: { product: { select: { costPrice: true, price: true } } } },
        payments: { where: { status: 'APPROVED' } },
      },
    })

    let totalReceita = 0
    let totalCusto = 0

    for (const order of orders) {
      for (const item of order.items ?? []) {
        const price = item.product?.price ? parseFloat(String(item.product.price)) : 0
        const costPrice = item.product?.costPrice ? parseFloat(String(item.product.costPrice)) : 0
        totalReceita += price * item.quantity
        totalCusto += costPrice * item.quantity
      }
    }

    const lucroLiquido = totalReceita - totalCusto
    const margemLucro = totalReceita > 0 ? (lucroLiquido / totalReceita) * 100 : 0

    return {
      receita: parseFloat(totalReceita.toFixed(2)),
      custo: parseFloat(totalCusto.toFixed(2)),
      lucroLiquido: parseFloat(lucroLiquido.toFixed(2)),
      margemLucro: parseFloat(margemLucro.toFixed(2)),
      pedidos: orders.length,
      ticketMedio: orders.length > 0 ? parseFloat((totalReceita / orders.length).toFixed(2)) : 0,
    }
  }

  async getDreByProduct(tenantId: string, startDate: Date, endDate: Date) {
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['OPEN', 'IN_PROGRESS', 'CLOSED'] },
        },
      },
      include: { product: true, order: true },
    })

    const productMap = new Map<string, any>()

    for (const item of orderItems) {
      const key = item.productId
      const price = item.product?.price ? parseFloat(String(item.product.price)) : 0
      const costPrice = item.product?.costPrice ? parseFloat(String(item.product.costPrice)) : 0
      const receita = price * item.quantity
      const custo = costPrice * item.quantity
      const lucro = receita - custo

      if (!productMap.has(key)) {
        productMap.set(key, {
          id: item.productId,
          nome: item.product?.name || 'Produto Deletado',
          quantidade: 0,
          receita: 0,
          custo: 0,
          lucro: 0,
        })
      }

      const current = productMap.get(key)
      if (current) {
        current.quantidade += item.quantity
        current.receita += receita
        current.custo += custo
        current.lucro += lucro
      }
    }

    return Array.from(productMap.values())
      .map((p: any) => ({
        ...p,
        receita: parseFloat(p.receita.toFixed(2)),
        custo: parseFloat(p.custo.toFixed(2)),
        lucro: parseFloat(p.lucro.toFixed(2)),
        margem: p.receita > 0 ? parseFloat(((p.lucro / p.receita) * 100).toFixed(2)) : 0,
      }))
      .sort((a: any, b: any) => b.lucro - a.lucro)
  }

  async getDreDaily(tenantId: string, startDate: Date, endDate: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ['OPEN', 'IN_PROGRESS', 'CLOSED'] },
      },
      include: {
        items: { include: { product: { select: { costPrice: true, price: true } } } },
      },
    })

    const dailyMap = new Map<string, any>()

    for (const order of orders) {
      const day = order.createdAt.toISOString().split('T')[0]

      if (!dailyMap.has(day)) {
        dailyMap.set(day, { data: day, receita: 0, custo: 0, lucro: 0, pedidos: 0 })
      }

      const current = dailyMap.get(day)
      if (current) {
        current.pedidos += 1

        for (const item of order.items ?? []) {
          const price = item.product?.price ? parseFloat(String(item.product.price)) : 0
          const costPrice = item.product?.costPrice ? parseFloat(String(item.product.costPrice)) : 0
          const receita = price * item.quantity
          const custo = costPrice * item.quantity
          current.receita += receita
          current.custo += custo
          current.lucro += receita - custo
        }
      }
    }

    return Array.from(dailyMap.values())
      .map((d: any) => ({
        ...d,
        receita: parseFloat(d.receita.toFixed(2)),
        custo: parseFloat(d.custo.toFixed(2)),
        lucro: parseFloat(d.lucro.toFixed(2)),
      }))
      .sort((a: any, b: any) => a.data.localeCompare(b.data))
  }
}
