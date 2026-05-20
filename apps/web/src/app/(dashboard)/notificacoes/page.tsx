'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCircle2, Loader2, Truck, ShoppingBag, UtensilsCrossed, Clock, Volume2, VolumeX, ReceiptText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useKitchenSocket } from '@/hooks/use-kitchen-socket'
import { WsEvent } from '@budstack/types'

interface ReadyItem {
  id: string
  orderId: string
  orderNumber: number
  tableNumber: number | null
  customerName: string | null
  productName: string
  quantity: number
  notes: string | null
  readyAt: string
}

interface BillRequest {
  orderId: string
  orderNumber: number
  tableNumber: number | null
  customerName: string | null
  billRequestedAt: string
  total: number
}

function elapsed(dateStr: string): { text: string; isLate: boolean } {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  const isLate = secs > 300 // 5 min
  if (secs < 60) return { text: `${secs}s`, isLate }
  const mins = Math.floor(secs / 60)
  if (mins < 60) return { text: `${mins}min`, isLate }
  return { text: `${Math.floor(mins / 60)}h${mins % 60}min`, isLate }
}

function ElapsedBadge({ date }: { date: string }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000)
    return () => clearInterval(id)
  }, [])
  const { text, isLate } = elapsed(date)
  return (
    <span className={cn('flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold', isLate ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400')}>
      <Clock className="h-3.5 w-3.5" /> {text}
      {isLate && ' ⚠️'}
    </span>
  )
}

export default function NotificacoesPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set())

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['notif-ready-orders'],
    queryFn: () => api.get('/orders?status=OPEN,IN_PROGRESS').then((r) => r.data),
    refetchInterval: 3000,
  })

  // WebSocket: invalida a query imediatamente quando um item fica pronto
  useKitchenSocket({
    [WsEvent.ORDER_ITEM_STATUS]: (payload) => {
      if (payload.status === 'READY') {
        if (soundEnabled) {
          try { new Audio('/sounds/bell.mp3').play() } catch {}
        }
        qc.invalidateQueries({ queryKey: ['notif-ready-orders'] })
      }
    },
    [WsEvent.BILL_REQUESTED]: () => {
      qc.invalidateQueries({ queryKey: ['notif-ready-orders'] })
    },
  })

  // Extrai todos os itens READY de pedidos em aberto
  const readyItems: ReadyItem[] = (orders as any[]).flatMap((order) =>
    (order.items ?? [])
      .filter((item: any) => item.status === 'READY')
      .map((item: any) => ({
        id: item.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.table?.number ?? null,
        customerName: order.customerName ?? null,
        productName: item.product?.name ?? 'Item',
        quantity: item.quantity,
        notes: item.notes ?? null,
        readyAt: item.readyAt ?? item.updatedAt ?? item.createdAt,
      }))
  )

  // Pedidos com conta solicitada (campo billRequestedAt persistido no banco)
  const billRequests: BillRequest[] = (orders as any[])
    .filter((order) => !!order.billRequestedAt)
    .map((order) => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableNumber: order.table?.number ?? null,
      customerName: order.customerName ?? null,
      billRequestedAt: order.billRequestedAt,
      total: Number(order.total ?? 0),
    }))

  // Toca som para novos itens READY
  useEffect(() => {
    const newIds = readyItems.map((i) => i.id)
    const hasNew = newIds.some((id) => !knownIds.has(id))
    if (hasNew && knownIds.size > 0 && soundEnabled) {
      try { new Audio('/sounds/bell.mp3').play() } catch {}
    }
    setKnownIds(new Set(newIds))
  }, [readyItems.map((i) => i.id).join(',')])

  const deliver = useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: string; itemId: string }) =>
      api.patch(`/orders/${orderId}/items/${itemId}/status`, { status: 'DELIVERED' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-ready-orders'] })
      toast({ title: 'Item marcado como entregue' })
    },
    onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
  })

  const deliverAll = useMutation({
    mutationFn: async () => {
      for (const item of readyItems) {
        await api.patch(`/orders/${item.orderId}/items/${item.id}/status`, { status: 'DELIVERED' })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-ready-orders'] })
      toast({ title: `${readyItems.length} itens marcados como entregues` })
    },
  })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg" style={{ background: 'linear-gradient(135deg, #22D3EE 0%, #3B82F6 50%, #8B5CF6 100%)', boxShadow: '0 4px 16px rgba(6,182,212,0.3)' }}">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pedidos Prontos</h1>
            <p className="text-sm text-slate-500">{readyItems.length} aguardando entrega</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
              soundEnabled ? 'border-cyan-200 bg-cyan-50 text-cyan-600 dark:border-cyan-900/40 dark:bg-cyan-900/10 dark:text-cyan-400'
                          : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900')}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {soundEnabled ? 'Som ativo' : 'Mudo'}
          </button>
          {readyItems.length > 1 && (
            <Button
              onClick={() => deliverAll.mutate()}
              disabled={deliverAll.isPending}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {deliverAll.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Entregar todos ({readyItems.length})
            </Button>
          )}
        </div>
      </div>

      {/* Contas pedidas */}
      {billRequests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Contas Pedidas</h2>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">
              {billRequests.length}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {billRequests.map((req) => (
              <motion.div
                key={req.orderId}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="flex flex-col rounded-3xl border-2 border-blue-200 bg-white shadow-sm dark:border-blue-900/40 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between p-5 pb-3">
                  <div className="flex items-center gap-3">
                    {req.tableNumber ? (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/20">
                        <span className="text-2xl font-black text-blue-500">{req.tableNumber}</span>
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-900/20">
                        <ShoppingBag className="h-6 w-6 text-purple-500" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {req.tableNumber ? 'Mesa' : 'Retirada'}
                      </p>
                      <p className="text-lg font-black text-slate-900 dark:text-white">#{req.orderNumber}</p>
                    </div>
                  </div>
                  <ElapsedBadge date={req.billRequestedAt} />
                </div>
                <div className="flex-1 px-5 pb-3">
                  <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 dark:bg-blue-900/10">
                    <ReceiptText className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                      Conta solicitada pelo cliente
                    </span>
                  </div>
                  {req.total > 0 && (
                    <p className="mt-2 text-right text-sm font-bold text-slate-900 dark:text-white">
                      Total: R$ {req.total.toFixed(2).replace('.', ',')}
                    </p>
                  )}
                </div>
                <div className="p-5 pt-0">
                  <Button
                    size="lg"
                    className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => window.location.href = `/pdv?pedido=${req.orderId}`}
                  >
                    <ReceiptText className="h-4 w-4" />
                    Ir para o Caixa
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
        </div>
      ) : readyItems.length === 0 && billRequests.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white py-24 dark:border-slate-800 dark:bg-slate-900">
          <CheckCircle2 className="mb-4 h-16 w-16 text-green-400" />
          <p className="text-xl font-bold text-slate-700 dark:text-slate-200">Tudo entregue!</p>
          <p className="mt-1 text-sm text-slate-400">Nenhum pedido aguardando entrega</p>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence>
            {readyItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="flex flex-col rounded-3xl border-2 border-green-200 bg-white shadow-sm dark:border-green-900/40 dark:bg-slate-900"
              >
                {/* Card header */}
                <div className="flex items-start justify-between p-5 pb-3">
                  <div className="flex items-center gap-3">
                    {item.tableNumber ? (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 dark:bg-cyan-900/20">
                        <span className="text-2xl font-black text-cyan-500">{item.tableNumber}</span>
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-900/20">
                        <ShoppingBag className="h-6 w-6 text-purple-500" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {item.tableNumber ? 'Mesa' : 'Retirada'}
                      </p>
                      <p className="text-lg font-black text-slate-900 dark:text-white">
                        #{item.orderNumber}
                      </p>
                    </div>
                  </div>
                  <ElapsedBadge date={item.readyAt} />
                </div>

                {/* Product info */}
                <div className="flex-1 px-5 pb-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white dark:bg-white dark:text-slate-900">
                      {item.quantity}
                    </span>
                    <p className="text-base font-bold leading-tight text-slate-900 dark:text-white">{item.productName}</p>
                  </div>
                  {item.notes && (
                    <p className="mt-2 rounded-xl bg-yellow-50 px-3 py-1.5 text-xs text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                      📝 {item.notes}
                    </p>
                  )}
                  {item.customerName && !item.tableNumber && (
                    <p className="mt-2 text-sm text-purple-600 dark:text-purple-400 font-medium">
                      👤 {item.customerName}
                    </p>
                  )}
                </div>

                {/* Action */}
                <div className="p-5 pt-0">
                  <Button
                    size="lg"
                    className="w-full gap-2 bg-green-600 text-white hover:bg-green-700"
                    onClick={() => deliver.mutate({ orderId: item.orderId, itemId: item.id })}
                    disabled={deliver.isPending}
                  >
                    {deliver.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                    Entregar
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
