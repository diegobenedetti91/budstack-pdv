import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { UserRole } from '@budstack/types'

export class CreateUserDto {
  @IsString() name: string
  @IsEmail() email: string
  @IsString() @MinLength(8) password: string
  @IsOptional() @IsEnum(UserRole) role?: UserRole
  @IsOptional() @IsString() pin?: string
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true, email: true, role: true, isActive: true, avatarUrl: true, createdAt: true },
      orderBy: { name: 'asc' },
    })
  }

  async create(tenantId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email_tenantId: { email: dto.email, tenantId } },
    })
    if (existing) throw new ConflictException('Email já cadastrado')

    const hashed = await bcrypt.hash(dto.password, 10)
    return this.prisma.user.create({
      data: { tenantId, ...dto, password: hashed },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })
  }

  async update(tenantId: string, id: string, dto: Partial<CreateUserDto>) {
    await this.findOne(tenantId, id)
    const data: any = { ...dto }
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10)
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })
  }

  async toggleActive(tenantId: string, id: string) {
    const user = await this.findOne(tenantId, id)
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, isActive: true },
    })
  }

  private async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } })
    if (!user) throw new NotFoundException('Usuário não encontrado')
    return user
  }
}
