'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth.store'
import { WsEvent } from '@budstack/types'

type EventHandler = (payload: any) => void

export function useKitchenSocket(handlers: Partial<Record<WsEvent, EventHandler>>) {
  const socketRef = useRef<Socket | null>(null)
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!user?.tenantId || !token) return

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001'

    socketRef.current = io(`${wsUrl}/kitchen`, {
      query: { tenantId: user.tenantId },
      auth: { token },
      transports: ['websocket'],
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      socket.emit('join_tenant', user.tenantId)
    })

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler)
    })

    return () => {
      socket.disconnect()
    }
  }, [user?.tenantId, token])

  const emit = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data)
  }, [])

  return { emit }
}
