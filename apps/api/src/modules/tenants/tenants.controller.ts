import { Controller, Get, Param } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { TenantsService } from './tenants.service'
import { TenantId } from '../../common/decorators/tenant.decorator'
import { Public } from '../../common/decorators/public.decorator'

@ApiTags('Tenants')
@Controller('tenants')
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  findMe(@TenantId() tenantId: string) {
    return this.tenantsService.findById(tenantId)
  }

  @Get(':slug/public')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.tenantsService.findBySlug(slug)
  }
}
