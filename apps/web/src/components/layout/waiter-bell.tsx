'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, X, CheckCheck, UtensilsCrossed, ReceiptText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useKitchenSocket } from '@/hooks/use-kitchen-socket'
import { useNotificationStore, WaiterNotification } from '@/stores/notifications.store'
import { WsEvent } from '@budstack/types'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (secs < 60) return 'agora'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}min`
  return `${Math.floor(mins / 60)}h`
}

export function WaiterBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { notifications, add, markRead, markAllRead } = useNotificationStore()
  const notifiedItemIds = useRef<Set<string>>(new Set())
  const notifiedBillIds = useRef<Set<string>>(new Set())

  const unread = notifications.filter((n) => !n.read)

  useKitchenSocket({
    [WsEvent.ORDER_ITEM_STATUS]: (payload) => {
      if (payload.status !== 'READY') return
      if (notifiedItemIds.current.has(payload.itemId)) return
      notifiedItemIds.current.add(payload.itemId)
      add({
        type: 'item_ready',
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        itemId: payload.itemId,
        itemName: payload.itemName,
        tableNumber: payload.tableNumber ?? null,
        tableId: payload.tableId ?? null,
      })
      try { new Audio('/sounds/bell.mp3').play() } catch {}
    },
    [WsEvent.BILL_REQUESTED]: (payload) => {
      const key = `bill-${payload.orderId}`
      if (notifiedBillIds.current.has(key)) return
      notifiedBillIds.current.add(key)
      add({
        type: 'bill_requested',
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        itemId: key,
        itemName: 'Conta solicitada',
        tableNumber: payload.tableNumber ?? null,
        tableId: payload.tableId ?? null,
      })
      try { new Audio('/sounds/bell.mp3').play() } catch {}
    },
  })

  // Polling de fallback — itens prontos e contas pedidas
  useQuery({
    queryKey: ['waiter-ready-items'],
    queryFn: async () => {
      const { data: orders } = await api.get('/orders?status=OPEN,IN_PROGRESS')
      for (const order of orders) {
        // Itens prontos
        for (const item of order.items ?? []) {
          if (item.status === 'READY' && !notifiedItemIds.current.has(item.id)) {
            notifiedItemIds.current.add(item.id)
            add({
              type: 'item_ready',
              orderId: order.id,
              orderNumber: order.orderNumber,
              itemId: item.id,
              itemName: item.product?.name ?? 'Item',
              tableNumber: order.table?.number ?? null,
              tableId: order.tableId ?? null,
            })
            try { new Audio('/sounds/bell.mp3').play() } catch {}
          }
        }
        // Contas pedidas (campo persistido no banco)
        if (order.billRequestedAt) {
          const key = `bill-${order.id}`
          if (!notifiedBillIds.current.has(key)) {
            notifiedBillIds.current.add(key)
            add({
              type: 'bill_requested',
              orderId: order.id,
              orderNumber: order.orderNumber,
              itemId: key,
              itemName: 'Conta solicitada',
              tableNumber: order.table?.number ?? null,
              tableId: order.tableId ?? null,
            })
            try { new Audio('/sounds/bell.mp3').play() } catch {}
          }
        }
      }
      return null
    },
    refetchInterval: 3000,
    staleTime: 0,
  })

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 rounded-full"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-bold text-white">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Notificações</p>
              <p className="text-xs text-slate-400">{unread.length} não lida{unread.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-1">
              {unread.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  onClick={markAllRead}
                >
                  <CheckCheck className="h-3 w-3" /> Marcar todos
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-300 dark:text-slate-600">
                <UtensilsCrossed className="mb-2 h-8 w-8" />
                <p className="text-xs">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} n={n} onRead={() => markRead(n.id)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationItem({ n, onRead }: { n: WaiterNotification; onRead: () => void }) {
  const isBill = n.type === 'bill_requested'
  return (
    <div
      className={cn(
        'flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50',
        !n.read && (isBill ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-cyan-50 dark:bg-cyan-900/10'),
      )}
      onClick={onRead}
    >
      <div className={cn(
        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
        n.read ? 'bg-slate-100 dark:bg-slate-800' : isBill ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-cyan-100 dark:bg-cyan-900/30',
      )}>
        {isBill
          ? <ReceiptText className={cn('h-4 w-4', n.read ? 'text-slate-400' : 'text-blue-500')} />
          : <UtensilsCrossed className={cn('h-4 w-4', n.read ? 'text-slate-400' : 'text-cyan-500')} />
        }
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-semibold leading-tight', n.read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white')}>
          {n.tableNumber ? `Mesa ${n.tableNumber}` : 'Para viagem'} — Pedido #{n.orderNumber}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
          {isBill ? 'Cliente solicitou a conta' : `${n.itemName} está pronto para servir`}
        </p>
        <p className="mt-1 text-[10px] text-slate-300 dark:text-slate-600">
          {timeAgo(n.receivedAt)}
        </p>
      </div>

      {!n.read && (
        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', isBill ? 'bg-blue-500' : 'bg-cyan-500')} />
      )}
    </div>
  )
}
