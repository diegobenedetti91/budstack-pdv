import { IsString, IsEmail, IsOptional, IsEnum, IsNumber, IsUrl } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { TaxRegime, TefProvider } from '@budstack/types'

export class UpsertCompanyDto {
  @ApiProperty() @IsString() tradeName: string
  @ApiProperty() @IsString() companyName: string
  @ApiProperty() @IsString() cnpj: string
  @ApiPropertyOptional() @IsOptional() @IsString() stateRegistration?: string
  @ApiPropertyOptional() @IsOptional() @IsString() municipalRegistration?: string

  @ApiProperty() @IsString() street: string
  @ApiProperty() @IsString() number: string
  @ApiPropertyOptional() @IsOptional() @IsString() complement?: string
  @ApiProperty() @IsString() neighborhood: string
  @ApiProperty() @IsString() city: string
  @ApiProperty() @IsString() state: string
  @ApiProperty() @IsString() zipCode: string

  @ApiProperty() @IsString() phone: string
  @ApiProperty() @IsEmail() email: string
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string

  @ApiPropertyOptional({ enum: TaxRegime }) @IsOptional() @IsEnum(TaxRegime) taxRegime?: TaxRegime
  @ApiPropertyOptional() @IsOptional() @IsString() satSerialNumber?: string
  @ApiPropertyOptional() @IsOptional() @IsString() satActivationCode?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() nfceSerialNumber?: number
  @ApiPropertyOptional() @IsOptional() @IsString() nfceCscId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() nfceCscToken?: string

  @ApiPropertyOptional({ enum: TefProvider }) @IsOptional() @IsEnum(TefProvider) tefProvider?: TefProvider
  @ApiPropertyOptional() @IsOptional() @IsString() tefIpAddress?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() tefPort?: number
  @ApiPropertyOptional() @IsOptional() @IsString() tefStoreId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() tefTerminalId?: string

  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string
  @ApiPropertyOptional() @IsOptional() @IsString() primaryColor?: string
  @ApiPropertyOptional() @IsOptional() @IsString() accentColor?: string
}
