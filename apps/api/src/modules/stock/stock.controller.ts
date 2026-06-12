import { Controller, Get, Patch, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { StockService } from './stock.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TenantId } from '../../common/decorators/tenant.decorator'

@ApiTags('Estoque')
@Controller('stock')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  async getAllProducts(@TenantId() tenantId: string) {
    return this.stockService.getAllProductsWithStock(tenantId)
  }

  @Get('low-stock')
  async getLowStock(@TenantId() tenantId: string) {
    return this.stockService.getLowStockProducts(tenantId)
  }

  @Get('notifications')
  async getNotifications(
    @TenantId() tenantId: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.stockService.getStockNotifications(tenantId, unreadOnly === 'true')
  }

  @Patch('notifications/:id/read')
  async markAsRead(@TenantId() tenantId: string) {
    // Mark all as read
    return this.stockService.markAllNotificationsAsRead(tenantId)
  }
}
