import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

const getSocket = () => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })
  }
  return socket
}

export function useStockUpdates(tenantId?: string) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!tenantId) return

    const sock = getSocket()

    // Conectar se não estiver conectado
    if (!sock.connected) {
      sock.connect()
    }

    // Listen para atualizações de estoque
    const handleStockUpdate = (data: any) => {
      if (data.tenantId === tenantId) {
        // Invalidar queries de estoque para forçar refetch
        qc.invalidateQueries({ queryKey: ['stock', 'low-stock'] })
        qc.invalidateQueries({ queryKey: ['stock', 'notifications'] })
      }
    }

    sock.on('stock:updated', handleStockUpdate)

    return () => {
      sock.off('stock:updated', handleStockUpdate)
    }
  }, [tenantId, qc])
}
