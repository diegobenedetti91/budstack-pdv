import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { OrderType } from '@budstack/types'

export class CreateOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() tableId?: string
  @ApiPropertyOptional({ enum: OrderType }) @IsOptional() @IsEnum(OrderType) type?: OrderType
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) customerCount?: number
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string
}
