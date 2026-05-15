import { IsEmail, IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ example: 'admin@restaurante.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @MinLength(6)
  password: string

  @ApiProperty({ example: 'meu-restaurante' })
  @IsString()
  tenantSlug: string
}
