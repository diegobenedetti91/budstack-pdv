import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { UsersService, CreateUserDto } from './users.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { TenantId } from '../../common/decorators/tenant.decorator'
import { UserRole } from '@budstack/types'

@ApiTags('Usuários')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get() @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(@TenantId() tenantId: string) { return this.usersService.findAll(tenantId) }

  @Post() @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@TenantId() tenantId: string, @Body() dto: CreateUserDto) { return this.usersService.create(tenantId, dto) }

  @Patch(':id') @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateUserDto>) { return this.usersService.update(tenantId, id, dto) }

  @Patch(':id/toggle') @Roles(UserRole.ADMIN)
  toggle(@TenantId() tenantId: string, @Param('id') id: string) { return this.usersService.toggleActive(tenantId, id) }
}
