import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { WsException } from '@nestjs/websockets'

@Injectable()
export class JwtWsGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient()
    const token = client.handshake?.auth?.token || client.handshake?.query?.token
    if (!token) throw new WsException('Não autorizado')
    try {
      const payload = this.jwt.verify(token, { secret: process.env.JWT_SECRET })
      client.user = payload
      return true
    } catch {
      throw new WsException('Token inválido')
    }
  }
}
