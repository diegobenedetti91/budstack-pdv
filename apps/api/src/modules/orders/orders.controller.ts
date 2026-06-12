import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseArrayPipe } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { OrdersService } from './orders.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { AddItemDto } from './dto/add-item.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TenantId } from '../../common/decorators/tenant.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { OrderStatus, OrderItemStatus } from '@budstack/types'

@ApiTags('Pedidos')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false, isArray: true })
  @ApiQuery({ name: 'billRequested', type: Boolean, required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query('status', new ParseArrayPipe({ items: String, separator: ',', optional: true })) status?: OrderStatus[],
    @Query('billRequested') billRequested?: string,
  ) {
    const normalized = status?.length === 1 ? status[0] : status
    return this.ordersService.findAll(tenantId, normalized as any, billRequested === 'true')
  }

  @Get('table/:tableId/open')
  @ApiOperation({ summary: 'Buscar pedido aberto de uma mesa' })
  findOpenByTable(@TenantId() tenantId: string, @Param('tableId') tableId: string) {
    return this.ordersService.findOpenByTable(tenantId, tableId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar pedido por ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.ordersService.findOne(tenantId, id)
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo pedido/comanda' })
  create(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(tenantId, user.id, dto)
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Adicionar item ao pedido (vai para cozinha)' })
  addItem(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: AddItemDto) {
    return this.ordersService.addItem(tenantId, id, dto)
  }

  @Patch(':id/items/:itemId/status')
  @ApiOperation({ summary: 'Atualizar status do item (cozinha)' })
  updateItemStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body('status') status: OrderItemStatus,
  ) {
    return this.ordersService.updateItemStatus(tenantId, id, itemId, status)
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status do pedido' })
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateStatus(tenantId, id, status)
  }

  @Patch(':id/coupon')
  @ApiOperation({ summary: 'Aplicar cupom ao pedido' })
  applyCoupon(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body('couponCode') couponCode: string,
  ) {
    return this.ordersService.applyCoupon(tenantId, id, couponCode)
  }
}
