'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Plus, Clock, CheckCircle2, Loader2, CreditCard, ArrowLeft,
  UtensilsCrossed, StickyNote, ShoppingBag, PackageCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, cn } from '@/lib/utils'

const itemStatusConfig = {
  PENDING:      { label: 'Aguardando', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  IN_PRODUCTION:{ label: 'Produzindo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  READY:        { label: 'Pronto',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  DELIVERED:    { label: 'Entregue',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  CANCELLED:    { label: 'Cancelado',  color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
}

function elapsed(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h`
}

// ── Detalhe de pedido de RETIRADA ──────────────────────────────────────────────
function TakeoutDetail({ orderId }: { orderId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-by-id', orderId],
    queryFn: () => api.get(`/orders/${orderId}`).then((r) => r.data),
    refetchInterval: 10000,
  })

  const closeOrder = useMutation({
    mutationFn: () => api.patch(`/orders/${orderId}/status`, { status: 'CLOSED' }),
    onSuccess: () => {
      toast({ title: 'Pedido marcado como retirado' })
      qc.invalidateQueries({ queryKey: ['orders'] })
      router.push('/pedidos')
    },
    onError: () => toast({ title: 'Erro ao fechar pedido', variant: 'destructive' }),
  })

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
    </div>
  )
  if (!order) return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-slate-400">Pedido não encontrado</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/pedidos')}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-violet-500" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Retirada — Comanda #{order.orderNumber}
            </h1>
          </div>
          {order.customerName && (
            <p className="text-sm text-slate-500">
              Cliente: <span className="font-medium">{order.customerName}</span>
              {order.customerPhone && ` · ${order.customerPhone}`}
            </p>
          )}
        </div>
        <Button
          onClick={() => closeOrder.mutate()}
          disabled={closeOrder.isPending}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {closeOrder.isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <PackageCheck className="h-4 w-4" />}
          Marcar como Retirado
        </Button>
      </div>

      <OrderCard order={order} />
    </div>
  )
}

// ── Detalhe de COMANDA DE MESA ─────────────────────────────────────────────────
function TableDetail({ tableId }: { tableId: string }) {
  const router = useRouter()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-by-table', tableId],
    queryFn: () => api.get(`/orders/table/${tableId}/open`).then((r) => r.data),
    refetchInterval: 10000,
  })

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
    </div>
  )

  if (!order) return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="mb-4 text-slate-400">Nenhuma comanda aberta para esta mesa</p>
      <Button
        onClick={() => router.push(`/pedidos/nova?mesa=${tableId}`)}
        className="gap-2 bg-cyan-500 hover:bg-cyan-600"
      >
        <Plus className="h-4 w-4" /> Abrir Comanda
      </Button>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/mesas')}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Mesa {order.table?.number} — Comanda #{order.orderNumber}
          </h1>
          <p className="text-sm text-slate-500">{order.items?.length} itens</p>
        </div>
        <Button
          onClick={() => router.push(`/pedidos/nova?mesa=${tableId}&numero=${order.table?.number}`)}
          variant="outline"
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Adicionar Itens
        </Button>
        <Button
          onClick={() => router.push(`/pdv?pedido=${order.id}`)}
          className="gap-2 bg-cyan-500 hover:bg-cyan-600"
        >
          <CreditCard className="h-4 w-4" /> Fechar Conta
        </Button>
      </div>

      <OrderCard order={order} />
    </div>
  )
}

function OrderCard({ order }: { order: any }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/[0.06] dark:bg-[#111113]">
      <div className="border-b border-slate-100 p-4 dark:border-white/[0.05]">
        <h2 className="font-semibold text-slate-900 dark:text-white">Itens do Pedido</h2>
      </div>
      <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
        {order.items?.map((item: any, i: number) => {
          const status = itemStatusConfig[item.status as keyof typeof itemStatusConfig] ?? itemStatusConfig.PENDING
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-900/20">
                <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{item.quantity}×</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white">{item.product?.name}</p>
                {item.notes && (
                  <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                    <StickyNote className="h-3 w-3" /> {item.notes}
                  </p>
                )}
              </div>
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', status.color)}>
                {status.label}
              </span>
              <span className="w-20 text-right font-semibold text-slate-900 dark:text-white">
                {formatCurrency(item.totalPrice)}
              </span>
            </motion.div>
          )
        })}
      </div>
      <div className="border-t border-slate-100 p-4 dark:border-white/[0.05]">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
          </div>
          {Number(order.serviceCharge) > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Taxa de serviço</span><span>{formatCurrency(order.serviceCharge)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900 dark:border-white/[0.05] dark:text-white">
            <span>Total</span><span className="text-lg">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Lista de pedidos ───────────────────────────────────────────────────────────
function PedidosContent() {
  const params = useSearchParams()
  const router = useRouter()

  const tableId = params.get('mesa')
  const pedidoId = params.get('pedido')

  const { data: orders = [], isLoading: allLoading } = useQuery({
    queryKey: ['orders', 'OPEN,IN_PROGRESS'],
    queryFn: () => api.get('/orders?status=OPEN,IN_PROGRESS').then((r) => r.data),
    enabled: !tableId && !pedidoId,
    refetchInterval: 5000,
  })

  if (pedidoId) return <TakeoutDetail orderId={pedidoId} />
  if (tableId) return <TableDetail tableId={tableId} />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pedidos</h1>
          <p className="text-sm text-slate-500">{(orders as any[]).length} comanda(s) abertas</p>
        </div>
        <Button
          onClick={() => router.push('/mesas')}
          className="gap-2 bg-cyan-500 hover:bg-cyan-600 shadow-sm shadow-cyan-500/25"
        >
          <Plus className="h-4 w-4" /> Nova Comanda
        </Button>
      </div>

      {allLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
        </div>
      ) : (orders as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <UtensilsCrossed className="mb-3 h-14 w-14 text-slate-200 dark:text-white/10" />
          <p className="font-medium text-slate-400">Nenhuma comanda aberta</p>
          <p className="text-sm text-slate-300 dark:text-white/20">Abra um pedido pela tela de Mesas</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(orders as any[]).map((order: any, i: number) => {
            const isTakeout = !order.tableId
            const href = isTakeout ? `/pedidos?pedido=${order.id}` : `/pedidos?mesa=${order.tableId}`
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -2 }}
                onClick={() => router.push(href)}
                className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-white/[0.06] dark:bg-[#111113]"
              >
                {/* Top gradient accent bar */}
                <div className={cn('h-0.5 brand-gradient', isTakeout && 'opacity-60')} />

                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/25">
                        Comanda
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        #{order.orderNumber}
                      </p>
                    </div>
                    {isTakeout ? (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-900/20">
                        <ShoppingBag className="h-6 w-6 text-violet-500" />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl brand-gradient shadow-sm shadow-cyan-500/20">
                        <span className="text-xl font-bold text-white">{order.table?.number}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="h-3 w-3" />
                        {elapsed(order.createdAt)}
                      </span>
                      <span className="text-slate-300 dark:text-white/10">·</span>
                      <span className="text-slate-500">{order.items?.length ?? 0} itens</span>
                      {isTakeout && order.customerName && (
                        <span className="text-xs text-violet-500">{order.customerName}</span>
                      )}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function PedidosPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    }>
      <PedidosContent />
    </Suspense>
  )
}
