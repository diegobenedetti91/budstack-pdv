import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { UseGuards } from '@nestjs/common'
import { WsEvent } from '@budstack/types'

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/kitchen',
})
export class KitchenGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  handleConnection(client: Socket) {
    const tenantId = client.handshake.query.tenantId as string
    if (tenantId) {
      client.join(`tenant:${tenantId}`)
    }
  }

  handleDisconnect(client: Socket) {
    // cleanup handled by socket.io
  }

  // Emitido pelo OrdersService quando um item é adicionado
  emitNewOrder(tenantId: string, payload: any) {
    this.server.to(`tenant:${tenantId}`).emit(WsEvent.ORDER_CREATED, payload)
  }

  emitOrderItemStatus(tenantId: string, payload: any) {
    this.server.to(`tenant:${tenantId}`).emit(WsEvent.ORDER_ITEM_STATUS, payload)
  }

  emitTableStatus(tenantId: string, payload: any) {
    this.server.to(`tenant:${tenantId}`).emit(WsEvent.TABLE_STATUS, payload)
  }

  @SubscribeMessage('join_tenant')
  handleJoinTenant(@MessageBody() tenantId: string, @ConnectedSocket() client: Socket) {
    client.join(`tenant:${tenantId}`)
    return { event: 'joined', data: tenantId }
  }
}
