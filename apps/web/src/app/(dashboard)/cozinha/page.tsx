'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChefHat, CheckCircle2, Play, Loader2, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { useKitchenSocket } from '@/hooks/use-kitchen-socket'
import { WsEvent, OrderItemStatus } from '@budstack/types'
import { cn } from '@/lib/utils'

interface KitchenItem {
  id: string
  orderId: string
  orderNumber: number
  tableNumber?: number
  customerName?: string
  productName: string
  quantity: number
  notes?: string
  status: OrderItemStatus
  sentToKitchenAt: string
}

const statusConfig = {
  PENDING: {
    label: 'Aguardando',
    bg: 'border-yellow-200 bg-yellow-50 dark:border-yellow-900/40 dark:bg-yellow-900/10',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    nextStatus: 'IN_PRODUCTION' as OrderItemStatus,
    nextLabel: 'Iniciar',
    nextIcon: Play,
    nextColor: 'bg-blue-500 hover:bg-blue-600',
  },
  IN_PRODUCTION: {
    label: 'Produzindo',
    bg: 'border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/10',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    nextStatus: 'READY' as OrderItemStatus,
    nextLabel: 'Pronto',
    nextIcon: CheckCircle2,
    nextColor: 'bg-green-500 hover:bg-green-600',
  },
  READY: {
    label: 'Pronto para servir',
    bg: 'border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/10',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    nextStatus: 'DELIVERED' as OrderItemStatus,
    nextLabel: 'Entregue',
    nextIcon: Truck,
    nextColor: 'bg-slate-600 hover:bg-slate-700',
  },
}

function elapsed(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}min`
  return `${Math.floor(minutes / 60)}h${minutes % 60}min`
}

function ElapsedTimer({ date }: { date: string }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10000)
    return () => clearInterval(id)
  }, [])
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  const isLate = secs > 900 // 15 min
  return (
    <span className={cn('flex items-center gap-1 text-xs font-mono font-medium', isLate ? 'text-red-500' : 'text-slate-500')}>
      <Clock className="h-3 w-3" /> {elapsed(date)}
      {isLate && ' ⚠'}
    </span>
  )
}

export default function CozinhaPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'IN_PRODUCTION' | 'READY'>('ALL')

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: () => api.get('/orders?status=OPEN,IN_PROGRESS').then((r) => r.data),
    refetchInterval: 3000,
  })

  // Flatten all items from open orders
  const allItems: KitchenItem[] = orders.flatMap((order: any) =>
    (order.items ?? [])
      .filter((item: any) => item.status !== 'DELIVERED' && item.status !== 'CANCELLED')
      .map((item: any) => ({
        id: item.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.table?.number,
        customerName: order.customerName,
        productName: item.product?.name ?? 'Produto',
        quantity: item.quantity,
        notes: item.notes,
        status: item.status,
        sentToKitchenAt: item.sentToKitchenAt ?? item.createdAt,
      }))
  )

  const filtered = filter === 'ALL' ? allItems : allItems.filter((i) => i.status === filter)
  const sorted = [...filtered].sort((a, b) => new Date(a.sentToKitchenAt).getTime() - new Date(b.sentToKitchenAt).getTime())

  // WebSocket para novos pedidos em tempo real
  const { connected: wsConnected } = useKitchenSocket({
    [WsEvent.ORDER_CREATED]: (payload) => {
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
      toast({ title: `Novo pedido #${payload.orderNumber ?? ''}` })
      try { new Audio('/sounds/bell.mp3').play() } catch {}
    },
    [WsEvent.ORDER_ITEM_STATUS]: () => {
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
    },
  })

  const updateStatus = useMutation({
    mutationFn: ({ orderId, itemId, status }: { orderId: string; itemId: string; status: OrderItemStatus }) =>
      api.patch(`/orders/${orderId}/items/${itemId}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kitchen-orders'] }),
    onError: () => toast({ title: 'Erro ao atualizar status', variant: 'destructive' }),
  })

  const counts = {
    ALL: allItems.length,
    PENDING: allItems.filter((i) => i.status === 'PENDING').length,
    IN_PRODUCTION: allItems.filter((i) => i.status === 'IN_PRODUCTION').length,
    READY: allItems.filter((i) => i.status === 'READY').length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm" style={{ background: 'linear-gradient(135deg, #22D3EE 0%, #3B82F6 50%, #8B5CF6 100%)', boxShadow: '0 2px 8px rgba(6,182,212,0.3)' }}>
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">KDS — Cozinha</h1>
            <p className="text-xs text-slate-500">{allItems.length} itens em produção</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium dark:border-slate-700">
          <span className={cn('h-2 w-2 rounded-full', wsConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-300')} />
          {wsConnected ? 'Ao vivo' : 'Conectando...'}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { key: 'ALL', label: 'Todos', color: 'bg-slate-500' },
          { key: 'PENDING', label: 'Aguardando', color: 'bg-yellow-500' },
          { key: 'IN_PRODUCTION', label: 'Produzindo', color: 'bg-blue-500' },
          { key: 'READY', label: 'Prontos', color: 'bg-green-500' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition-all',
              filter === f.key
                ? `${f.color} border-transparent text-white shadow-md`
                : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
            )}
          >
            <span className="text-xl font-bold">{counts[f.key as keyof typeof counts]}</span>
            <span className="text-xs font-medium">{f.label}</span>
          </button>
        ))}
      </div>

      {/* Items grid */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </div>
      ) : sorted.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-slate-300">
          <CheckCircle2 className="mb-3 h-14 w-14" />
          <p className="text-slate-400 font-medium">Tudo em dia!</p>
          <p className="text-sm text-slate-300">Sem itens pendentes na cozinha</p>
        </motion.div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence>
            {sorted.map((item) => {
              const config = statusConfig[item.status as keyof typeof statusConfig] ?? statusConfig.PENDING
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  className={cn('rounded-2xl border-2 p-4 transition-shadow hover:shadow-md', config.bg)}
                >
                  {/* Order info */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.tableNumber ? (
                        <>
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/10 dark:bg-white/10">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{item.tableNumber}</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500">Mesa</p>
                            <p className="text-[10px] text-slate-400">#{item.orderNumber}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10">
                            <span className="text-xs font-bold text-purple-600">🛍</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-purple-600">Retirada</p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[80px]">{item.customerName ?? `#${item.orderNumber}`}</p>
                          </div>
                        </>
                      )}
                    </div>
                    <ElapsedTimer date={item.sentToKitchenAt} />
                  </div>

                  {/* Product */}
                  <div className="mb-3">
                    <div className="flex items-start gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white dark:bg-white dark:text-slate-900">
                        {item.quantity}
                      </span>
                      <p className="flex-1 font-semibold leading-tight text-slate-900 dark:text-white">{item.productName}</p>
                    </div>
                    {item.notes && (
                      <p className="mt-2 rounded-lg bg-yellow-100 px-2 py-1 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        📝 {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Status badge + action */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', config.badge)}>
                      {config.label}
                    </span>
                    {config.nextStatus && config.nextIcon && (
                      <Button
                        size="sm"
                        className={cn('gap-1.5 text-xs text-white shadow-sm', config.nextColor)}
                        onClick={() => updateStatus.mutate({ orderId: item.orderId, itemId: item.id, status: config.nextStatus! })}
                        disabled={updateStatus.isPending}
                      >
                        {updateStatus.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <config.nextIcon className="h-3 w-3" />
                        )}
                        {config.nextLabel}
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
