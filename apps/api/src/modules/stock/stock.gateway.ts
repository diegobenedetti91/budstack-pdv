import { Injectable } from '@nestjs/common'
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets'
import { Server } from 'socket.io'

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class StockGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server

  afterInit() {
    console.log('[StockGateway] initialized')
  }

  emitStockUpdate(tenantId: string, productId: string, newQuantity: number, minimumStock: number) {
    this.server.emit('stock:updated', {
      tenantId,
      productId,
      newQuantity,
      minimumStock,
      timestamp: new Date(),
    })
  }
}
