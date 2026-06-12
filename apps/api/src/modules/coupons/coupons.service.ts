import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { IsString, IsNumber, Min, IsDateString, IsOptional, IsEnum } from 'class-validator'
import { PrismaService } from '../prisma/prisma.service'

export class CreateCouponDto {
  @IsString() code: string
  @IsOptional() @IsString() description?: string
  @IsEnum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_ITEM']) discountType: string
  @IsNumber() @Min(0) discountValue: number
  @IsOptional() @IsNumber() @Min(1) maxUses?: number
  @IsOptional() @IsNumber() @Min(0) minOrderValue?: number
  @IsOptional() @IsNumber() @Min(0) maxDiscount?: number
  @IsDateString() validFrom: string
  @IsDateString() validUntil: string
}

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findFirst({
      where: { code: dto.code, tenantId },
    })
    if (existing) throw new BadRequestException('Cupom já existe')

    return this.prisma.coupon.create({
      data: {
        tenantId,
        code: dto.code.toUpperCase(),
        description: dto.description,
        discountType: dto.discountType as any,
        discountValue: dto.discountValue,
        maxUses: dto.maxUses,
        minOrderValue: dto.minOrderValue,
        maxDiscount: dto.maxDiscount,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
      },
    })
  }

  async findAll(tenantId: string) {
    return this.prisma.coupon.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findActive(tenantId: string) {
    const now = new Date()
    return this.prisma.coupon.findMany({
      where: {
        tenantId,
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      orderBy: { validUntil: 'asc' },
    })
  }

  async validate(tenantId: string, code: string, orderTotal: number) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { code: code.toUpperCase(), tenantId },
    })

    if (!coupon) throw new NotFoundException('Cupom não encontrado')
    if (!coupon.isActive) throw new BadRequestException('Cupom inativo')

    const now = new Date()
    if (coupon.validFrom > now) throw new BadRequestException('Cupom ainda não está válido')
    if (coupon.validUntil < now) throw new BadRequestException('Cupom expirou')

    if (coupon.minOrderValue && orderTotal < Number(coupon.minOrderValue)) {
      throw new BadRequestException(
        `Pedido mínimo de ${coupon.minOrderValue} não atingido`,
      )
    }

    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      throw new BadRequestException('Cupom atingiu o número máximo de usos')
    }

    let discount = 0
    if (coupon.discountType === 'PERCENTAGE') {
      discount = (orderTotal * Number(coupon.discountValue)) / 100
      if (coupon.maxDiscount) {
        discount = Math.min(discount, Number(coupon.maxDiscount))
      }
    } else if (coupon.discountType === 'FIXED_AMOUNT') {
      discount = Math.min(Number(coupon.discountValue), orderTotal)
    }

    return { coupon, discount }
  }

  async useCoupon(tenantId: string, code: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { code: code.toUpperCase(), tenantId },
    })
    if (!coupon) throw new NotFoundException('Cupom não encontrado')

    return this.prisma.coupon.update({
      where: { id: coupon.id },
      data: { currentUses: coupon.currentUses + 1 },
    })
  }

  async update(tenantId: string, id: string, dto: Partial<CreateCouponDto>) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } })
    if (!coupon) throw new NotFoundException('Cupom não encontrado')

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...dto,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    })
  }

  async delete(tenantId: string, id: string) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } })
    if (!coupon) throw new NotFoundException('Cupom não encontrado')

    return this.prisma.coupon.delete({ where: { id } })
  }

  async toggle(tenantId: string, id: string) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } })
    if (!coupon) throw new NotFoundException('Cupom não encontrado')

    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
    })
  }
}
