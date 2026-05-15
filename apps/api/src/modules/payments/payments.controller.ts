import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { PaymentsService, CreatePaymentDto } from './payments.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TenantId } from '../../common/decorators/tenant.decorator'

@ApiTags('Pagamentos')
@Controller('orders/:orderId/payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Param('orderId') orderId: string) {
    return this.paymentsService.getOrderPayments(tenantId, orderId)
  }

  @Post()
  create(@TenantId() tenantId: string, @Param('orderId') orderId: string, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.addPayment(tenantId, orderId, dto)
  }
}
