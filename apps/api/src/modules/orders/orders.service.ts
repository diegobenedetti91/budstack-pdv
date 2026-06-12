import { Injectable, NotFoundException, BadRequestException, Inject, Optional } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { KitchenGateway } from '../kitchen/kitchen.gateway'
import { WhatsappService } from '../whatsapp/whatsapp.service'
import { PrintService } from '../printers/print.service'
import { StockService } from '../stock/stock.service'
import { CouponsService } from '../coupons/coupons.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { AddItemDto } from './dto/add-item.dto'
import { OrderStatus, OrderItemStatus } from '@budstack/types'

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private kitchen: KitchenGateway,
    private whatsapp: WhatsappService,
    private print: PrintService,
    private stock: StockService,
    @Optional() private coupons?: CouponsService,
  ) {}

  async findAll(tenantId: string, status?: OrderStatus | OrderStatus[]) {
    let statusFilter: any = undefined
    if (status) {
      statusFilter = Array.isArray(status) ? { in: status } : status
    }
    return this.prisma.order.findMany({
      where: { tenantId, ...(statusFilter && { status: statusFilter }) },
      include: {
        table: true,
        user: { select: { id: true, name: true } },
        items: { include: { product: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(tenantId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        table: true,
        user: { select: { id: true, name: true } },
        items: { include: { product: true } },
        payments: true,
      },
    })
    if (!order) throw new NotFoundException('Pedido não encontrado')
    return order
  }

  async findOpenByTable(tenantId: string, tableId: string) {
    return this.prisma.order.findFirst({
      where: { tenantId, tableId, status: { in: ['OPEN', 'IN_PROGRESS', 'READY', 'DELIVERED'] } },
      include: {
        table: true,
        items: { include: { product: true } },
        payments: true,
      },
    })
  }

  async create(tenantId: string, userId: string, dto: CreateOrderDto) {
    const lastOrder = await this.prisma.order.findFirst({
      where: { tenantId },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    })
    const orderNumber = (lastOrder?.orderNumber ?? 0) + 1

    if (dto.tableId) {
      const openOrder = await this.findOpenByTable(tenantId, dto.tableId)
      if (openOrder) throw new BadRequestException('Mesa já possui um pedido aberto')

      await this.prisma.table.update({
        where: { id: dto.tableId },
        data: { status: 'OCCUPIED' },
      })
      this.kitchen.emitTableStatus(tenantId, { tableId: dto.tableId, status: 'OCCUPIED' })
    }

    return this.prisma.order.create({
      data: {
        tenantId,
        userId,
        tableId: dto.tableId,
        orderNumber,
        type: dto.type ?? 'TABLE',
        customerName: dto.customerName,
        customerCount: dto.customerCount,
        notes: dto.notes,
      },
      include: { table: true, items: true },
    })
  }

  async addItem(tenantId: string, orderId: string, dto: AddItemDto) {
    const order = await this.findOne(tenantId, orderId)
    if (order.status === 'CLOSED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Não é possível adicionar itens a um pedido fechado')
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId, isActive: true },
    })
    if (!product) throw new NotFoundException('Produto não encontrado')

    const unitPrice = Number(product.price)
    const totalPrice = unitPrice * dto.quantity

    const item = await this.prisma.orderItem.create({
      data: {
        orderId,
        productId: dto.productId,
        quantity: dto.quantity,
        unitPrice,
        totalPrice,
        notes: dto.notes,
        sentToKitchenAt: new Date(),
      },
      include: { product: true },
    })

    // Decrementar estoque
    console.log(`[OrdersService] Decrementando estoque - Produto: ${dto.productId}, Quantidade: ${dto.quantity}`)
    await this.stock.decrementStock(tenantId, dto.productId, dto.quantity)
    console.log(`[OrdersService] Estoque decrementado com sucesso`)

    await this.recalculateTotal(orderId, tenantId)

    // Atualiza status do pedido para IN_PROGRESS se estava OPEN
    if (order.status === 'OPEN') {
      await this.prisma.order.update({ where: { id: orderId }, data: { status: 'IN_PROGRESS' } })
    }

    // Emite para cozinha via WebSocket
    this.kitchen.emitNewOrder(tenantId, {
      orderId,
      orderNumber: order.orderNumber,
      tableId: order.tableId,
      item: {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        notes: item.notes,
        status: item.status,
      },
    })

    // Imprime na(s) impressora(s) de cozinha (fire-and-forget — nunca bloqueia)
    this.print.printKitchenTicket(tenantId, {
      orderNumber: order.orderNumber,
      tableNumber: order.table?.number ?? null,
      customerName: (order as any).customerName ?? null,
      productName: item.product.name,
      quantity: item.quantity,
      notes: item.notes ?? null,
      sentAt: new Date(),
    }).catch(() => { /* erros já logados no PrintService */ })

    return item
  }

  async updateItemStatus(tenantId: string, orderId: string, itemId: string, status: OrderItemStatus) {
    const order = await this.findOne(tenantId, orderId)
    const item = await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { status, ...(status === 'READY' && { readyAt: new Date() }) },
      include: { product: { select: { name: true } } },
    })

    this.kitchen.emitOrderItemStatus(tenantId, {
      orderId,
      itemId,
      status,
      orderNumber: order.orderNumber,
      tableNumber: order.table?.number ?? null,
      tableId: order.tableId ?? null,
      itemName: item.product.name,
    })

    // WhatsApp para retirada: notifica quando o pedido fica pronto
    if (status === 'READY' && !order.tableId && (order as any).customerPhone) {
      this.whatsapp.sendReadyNotification(
        (order as any).customerPhone,
        (order as any).customerName ?? 'Cliente',
        order.orderNumber,
      )
    }

    return item
  }

  async updateStatus(tenantId: string, orderId: string, status: OrderStatus) {
    const order = await this.findOne(tenantId, orderId)

    const updates: any = { status }
    if (status === 'CLOSED' || status === 'CANCELLED') {
      updates.closedAt = new Date()
      if (order.tableId) {
        await this.prisma.table.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' },
        })
        this.kitchen.emitTableStatus(tenantId, { tableId: order.tableId, status: 'AVAILABLE' })
      }
    }

    return this.prisma.order.update({ where: { id: orderId }, data: updates })
  }

  async applyCoupon(tenantId: string, orderId: string, couponCode: string) {
    if (!this.coupons) throw new BadRequestException('Serviço de cupons não disponível')

    const order = await this.findOne(tenantId, orderId)
    const { coupon, discount } = await this.coupons.validate(tenantId, couponCode, Number(order.subtotal))

    await this.coupons.useCoupon(tenantId, couponCode)

    const newTotal = Number(order.subtotal) + Number(order.serviceCharge) - discount

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        couponCode: coupon.code,
        couponDiscount: discount,
        total: newTotal,
      },
      include: {
        table: true,
        user: { select: { id: true, name: true } },
        items: { include: { product: true } },
        payments: true,
      },
    })
  }

  private async recalculateTotal(orderId: string, tenantId: string) {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId, status: { not: 'CANCELLED' } },
    })
    const subtotal = items.reduce((acc, item) => acc + Number(item.totalPrice), 0)

    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId } })
    const company = await this.prisma.company.findUnique({ where: { tenantId } })
    const serviceCharge = subtotal * Number(company?.serviceChargePercent ?? 0) / 100
    const total = subtotal + serviceCharge - Number(order?.couponDiscount ?? 0)

    await this.prisma.order.update({
      where: { id: orderId },
      data: { subtotal, serviceCharge, total },
    })
  }
}
