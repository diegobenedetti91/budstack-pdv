import { IsString, IsNumber, Min, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class AddItemDto {
  @ApiProperty() @IsString() productId: string
  @ApiProperty() @IsNumber() @Min(1) quantity: number
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string
}
