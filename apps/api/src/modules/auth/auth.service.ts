import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { RegisterTenantDto } from './dto/register-tenant.dto'
import { JwtPayload } from '@budstack/types'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    })
    if (!tenant || !tenant.isActive) throw new UnauthorizedException('Restaurante não encontrado')

    const user = await this.prisma.user.findUnique({
      where: { email_tenantId: { email: dto.email, tenantId: tenant.id } },
    })
    if (!user || !user.isActive) throw new UnauthorizedException('Credenciais inválidas')

    const passwordMatch = await bcrypt.compare(dto.password, user.password)
    if (!passwordMatch) throw new UnauthorizedException('Credenciais inválidas')

    return this.generateTokens(user)
  }

  async registerTenant(dto: RegisterTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } })
    if (existing) throw new ConflictException('Slug já está em uso')

    const hashedPassword = await bcrypt.hash(dto.adminPassword, 10)

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.tenantName,
        slug: dto.tenantSlug,
        users: {
          create: {
            name: dto.adminName,
            email: dto.adminEmail,
            password: hashedPassword,
            role: 'ADMIN',
          },
        },
      },
      include: { users: true },
    })

    return this.generateTokens(tenant.users[0])
  }

  async refreshToken(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.isActive) throw new UnauthorizedException()
    return this.generateTokens(user)
  }

  private generateTokens(user: { id: string; email: string; tenantId: string; role: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role as any,
    }

    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    })

    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    })

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } }
  }
}
