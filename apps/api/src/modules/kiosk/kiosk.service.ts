import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { KitchenGateway } from '../kitchen/kitchen.gateway'

@Injectable()
export class KioskService {
  constructor(
    private prisma: PrismaService,
    private kitchen: KitchenGateway,
  ) {}

  async getTenantInfo(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        company: {
          select: {
            tradeName: true,
            logoUrl: true,
            primaryColor: true,
            accentColor: true,
            serviceChargePercent: true,
          },
        },
      },
    })
    if (!tenant) throw new NotFoundException('Restaurante não encontrado')
    return tenant
  }

  async getMenu(slug: string) {
    const tenant = await this.getTenantInfo(slug)

    const categories = await this.prisma.category.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        products: {
          where: { isActive: true, isAvailable: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            variations: {
              where: { isActive: true },
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
    })

    return { tenant, categories }
  }

  async getTables(slug: string) {
    const tenant = await this.getTenantInfo(slug)
    return this.prisma.table.findMany({
      where: { tenantId: tenant.id },
      orderBy: { number: 'asc' },
      select: { id: true, number: true, name: true, capacity: true, status: true },
    })
  }

  async getTableCurrentOrder(slug: string, tableId: string) {
    const tenant = await this.getTenantInfo(slug)
    return this.prisma.order.findFirst({
      where: { tenantId: tenant.id, tableId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      include: {
        items: {
          where: { status: { not: 'CANCELLED' } },
          include: { product: { select: { name: true, imageUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
        payments: { where: { status: 'APPROVED' } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createOrder(slug: string, customerName?: string, customerPhone?: string, tableId?: string) {
    const tenant = await this.getTenantInfo(slug)

    if (tableId) {
      const table = await this.prisma.table.findFirst({ where: { id: tableId, tenantId: tenant.id } })
      if (table) {
        await this.prisma.table.update({ where: { id: tableId }, data: { status: 'OCCUPIED' } })
      }
    }

    const lastOrder = await this.prisma.order.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    })
    const orderNumber = (lastOrder?.orderNumber ?? 0) + 1

    return this.prisma.order.create({
      data: {
        tenantId: tenant.id,
        orderNumber,
        type: 'KIOSK',
        customerName,
        customerPhone,
        tableId: tableId ?? null,
      },
      select: { id: true, orderNumber: true, status: true, tableId: true, createdAt: true },
    })
  }

  async addItem(slug: string, orderId: string, productId: string, quantity: number, notes?: string) {
    const tenant = await this.getTenantInfo(slug)

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
    })
    if (!order) throw new NotFoundException('Pedido não encontrado')
    if (order.status === 'CLOSED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Pedido encerrado')
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: tenant.id, isActive: true, isAvailable: true },
    })
    if (!product) throw new NotFoundException('Produto não disponível')

    const unitPrice = Number(product.price)
    const totalPrice = unitPrice * quantity

    const item = await this.prisma.orderItem.create({
      data: { orderId, productId, quantity, unitPrice, totalPrice, notes, sentToKitchenAt: new Date() },
      include: { product: { select: { name: true } } },
    })

    // Recalcula total
    const items = await this.prisma.orderItem.findMany({ where: { orderId, status: { not: 'CANCELLED' } } })
    const subtotal = items.reduce((acc, i) => acc + Number(i.totalPrice), 0)
    const company = await this.prisma.company.findUnique({ where: { tenantId: tenant.id } })
    const serviceCharge = subtotal * Number(company?.serviceChargePercent ?? 0) / 100
    const total = subtotal + serviceCharge

    await this.prisma.order.update({
      where: { id: orderId },
      data: { subtotal, serviceCharge, total, status: 'IN_PROGRESS' },
    })

    this.kitchen.emitNewOrder(tenant.id, {
      orderId,
      orderNumber: order.orderNumber,
      item: {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        notes: item.notes,
        status: item.status,
      },
    })

    return item
  }

  async addPayment(slug: string, orderId: string, method: string, amount: number) {
    const tenant = await this.getTenantInfo(slug)

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
      include: { payments: true },
    })
    if (!order) throw new NotFoundException('Pedido não encontrado')

    const alreadyPaid = order.payments
      .filter((p) => p.status === 'APPROVED')
      .reduce((acc, p) => acc + Number(p.amount), 0)

    const remaining = Number(order.total) - alreadyPaid
    if (amount > remaining + 0.01) {
      throw new BadRequestException(`Valor excede o saldo restante`)
    }

    const payment = await this.prisma.payment.create({
      data: { orderId, method: method as any, amount, status: 'APPROVED' },
    })

    const newPaid = alreadyPaid + amount
    if (newPaid >= Number(order.total) - 0.01) {
      if (order.tableId) {
        // Mesa: fecha o pedido e libera a mesa
        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: 'CLOSED', closedAt: new Date() },
        })
        await this.prisma.table.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' },
        })
      }
      // Retirada: mantém IN_PROGRESS para a cozinha processar e marcar como entregue
    }

    return payment
  }

  async requestBill(slug: string, orderId: string) {
    const tenant = await this.getTenantInfo(slug)

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
      include: { table: { select: { number: true } } },
    })
    if (!order) throw new NotFoundException('Pedido não encontrado')
    if (order.status === 'CLOSED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Pedido já encerrado')
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { billRequestedAt: new Date() },
    })

    this.kitchen.emitBillRequested(tenant.id, {
      tenantId: tenant.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableNumber: order.table?.number ?? null,
      tableId: order.tableId ?? null,
    })

    return { ok: true }
  }

  async getOrder(slug: string, orderId: string) {
    const tenant = await this.getTenantInfo(slug)

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
      include: {
        items: { include: { product: { select: { name: true, imageUrl: true } } } },
        payments: true,
      },
    })
    if (!order) throw new NotFoundException('Pedido não encontrado')
    return order
  }
}
