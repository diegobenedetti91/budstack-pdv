import { Injectable, Inject, Optional } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { StockGateway } from './stock.gateway'

@Injectable()
export class StockService {
  constructor(
    private prisma: PrismaService,
    @Optional() @Inject(StockGateway) private stockGateway?: StockGateway,
  ) {}

  async decrementStock(tenantId: string, productId: string, quantity: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    })

    if (!product) {
      console.log(`[StockService] Produto ${productId} não encontrado`)
      return
    }

    if (!product.stockControl) {
      console.log(`[StockService] Controle de estoque desativado para ${product.name}`)
      return
    }

    const newQuantity = Math.max(0, product.stockQuantity - quantity)
    console.log(`[StockService] Decrementando ${product.name}: ${product.stockQuantity} → ${newQuantity}`)

    await this.prisma.product.update({
      where: { id: productId },
      data: { stockQuantity: newQuantity },
    })

    // Emitir via WebSocket para atualização em tempo real (se disponível)
    if (this.stockGateway) {
      try {
        this.stockGateway.emitStockUpdate(tenantId, productId, newQuantity, product.stockMinimum)
      } catch (err) {
        console.error('[StockService] Erro ao emitir update via WebSocket:', err)
      }
    }

    // Criar notificação se estoque atingiu mínimo
    if (newQuantity <= product.stockMinimum && newQuantity > 0) {
      await this.createNotification(
        tenantId,
        productId,
        'BELOW_MINIMUM',
        newQuantity,
        product.stockMinimum,
      )
    } else if (newQuantity === 0) {
      await this.createNotification(
        tenantId,
        productId,
        'OUT_OF_STOCK',
        newQuantity,
        product.stockMinimum,
      )
    }
  }

  async createNotification(
    tenantId: string,
    productId: string,
    type: 'BELOW_MINIMUM' | 'OUT_OF_STOCK',
    currentStock: number,
    minimumStock: number,
  ) {
    const existingNotification = await this.prisma.stockNotification.findFirst({
      where: { productId, type, isRead: false },
      orderBy: { createdAt: 'desc' },
    })

    // Evitar duplicatas se foi notificado há menos de 1 hora
    if (existingNotification) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
      if (existingNotification.createdAt > hourAgo) return
    }

    await this.prisma.stockNotification.create({
      data: {
        tenantId,
        productId,
        type,
        currentStock,
        minimumStock,
      },
    })
  }

  async getAllProductsWithStock(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId, stockControl: true, isActive: true },
      include: { category: true },
      orderBy: { category: { sortOrder: 'asc' }, name: 'asc' },
    })
  }

  async getLowStockProducts(tenantId: string) {
    // Buscar produtos com estoque <= mínimo
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        stockControl: true,
        isActive: true,
      },
      include: { category: true },
      orderBy: { stockQuantity: 'asc' },
    })

    // Filtrar manualmente no código (produtos com estoque <= mínimo)
    return products.filter(p => p.stockQuantity <= p.stockMinimum)
  }

  async getStockNotifications(tenantId: string, unreadOnly = false) {
    return this.prisma.stockNotification.findMany({
      where: {
        tenantId,
        ...(unreadOnly && { isRead: false }),
      },
      include: { product: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  async markNotificationAsRead(notificationId: string) {
    return this.prisma.stockNotification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })
  }

  async markAllNotificationsAsRead(tenantId: string) {
    return this.prisma.stockNotification.updateMany({
      where: { tenantId, isRead: false },
      data: { isRead: true },
    })
  }
}
