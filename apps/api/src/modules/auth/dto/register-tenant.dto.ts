import { IsEmail, IsString, MinLength, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterTenantDto {
  @ApiProperty({ example: 'Meu Restaurante' })
  @IsString()
  tenantName: string

  @ApiProperty({ example: 'meu-restaurante', description: 'Slug único, apenas letras minúsculas e hífens' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug deve conter apenas letras minúsculas, números e hífens' })
  tenantSlug: string

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  adminName: string

  @ApiProperty({ example: 'joao@meurestaurante.com' })
  @IsEmail()
  adminEmail: string

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @MinLength(8)
  adminPassword: string
}
