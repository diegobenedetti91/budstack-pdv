import { Controller, Get, Post, Body, Param } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { KioskService } from './kiosk.service'
import { Public } from '../../common/decorators/public.decorator'

@ApiTags('Kiosk (Público)')
@Controller('kiosk')
@Public()
export class KioskController {
  constructor(private readonly kioskService: KioskService) {}

  @Get(':slug/info')
  @ApiOperation({ summary: 'Informações públicas do restaurante' })
  getTenantInfo(@Param('slug') slug: string) {
    return this.kioskService.getTenantInfo(slug)
  }

  @Get(':slug/menu')
  @ApiOperation({ summary: 'Cardápio completo (categorias + produtos)' })
  getMenu(@Param('slug') slug: string) {
    return this.kioskService.getMenu(slug)
  }

  @Post(':slug/orders')
  @ApiOperation({ summary: 'Criar pedido pelo totem' })
  createOrder(
    @Param('slug') slug: string,
    @Body() body: { customerName?: string },
  ) {
    return this.kioskService.createOrder(slug, body.customerName)
  }

  @Post(':slug/orders/:orderId/items')
  @ApiOperation({ summary: 'Adicionar item ao pedido do totem' })
  addItem(
    @Param('slug') slug: string,
    @Param('orderId') orderId: string,
    @Body() body: { productId: string; quantity: number; notes?: string },
  ) {
    return this.kioskService.addItem(slug, orderId, body.productId, body.quantity, body.notes)
  }

  @Post(':slug/orders/:orderId/payments')
  @ApiOperation({ summary: 'Registrar pagamento no pedido do totem' })
  addPayment(
    @Param('slug') slug: string,
    @Param('orderId') orderId: string,
    @Body() body: { method: string; amount: number },
  ) {
    return this.kioskService.addPayment(slug, orderId, body.method, body.amount)
  }

  @Get(':slug/orders/:orderId')
  @ApiOperation({ summary: 'Acompanhar status do pedido' })
  getOrder(
    @Param('slug') slug: string,
    @Param('orderId') orderId: string,
  ) {
    return this.kioskService.getOrder(slug, orderId)
  }
}
