'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Clock, CheckCircle2, Loader2, CreditCard, Printer, ArrowLeft, UtensilsCrossed, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, cn } from '@/lib/utils'

const itemStatusConfig = {
  PENDING: { label: 'Aguardando', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  IN_PRODUCTION: { label: 'Produzindo', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  READY: { label: 'Pronto', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  DELIVERED: { label: 'Entregue', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
}

function PedidosContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const qc = useQueryClient()
  const tableId = params.get('mesa')

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-by-table', tableId],
    queryFn: () => tableId
      ? api.get(`/orders/table/${tableId}/open`).then((r) => r.data)
      : Promise.resolve(null),
    refetchInterval: 10000,
    enabled: !!tableId,
  })

  const { data: orders = [], isLoading: allLoading } = useQuery({
    queryKey: ['orders', 'OPEN'],
    queryFn: () => api.get('/orders?status=OPEN').then((r) => r.data),
    enabled: !tableId,
    refetchInterval: 15000,
  })

  if (!tableId) {
    // Listagem de todas as comandas abertas
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pedidos</h1>
            <p className="text-sm text-slate-500">{orders.length} comanda(s) abertas</p>
          </div>
          <Button onClick={() => router.push('/mesas')} className="gap-2 bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4" /> Nova Comanda
          </Button>
        </div>

        {allLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <UtensilsCrossed className="mb-3 h-14 w-14" />
            <p className="text-slate-400 font-medium">Nenhuma comanda aberta</p>
            <p className="text-sm text-slate-300">Abra um pedido pela tela de Mesas</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map((order: any) => (
              <motion.div
                key={order.id}
                whileHover={{ y: -2 }}
                onClick={() => router.push(`/pedidos?mesa=${order.tableId}`)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-400">Comanda</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">#{order.orderNumber}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-900/20">
                    <span className="text-xl font-bold text-orange-500">{order.table?.number ?? '—'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{order.items?.length ?? 0} itens</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(order.total)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Vista de comanda específica
  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>

  if (!order) return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-slate-400 mb-4">Nenhuma comanda aberta para esta mesa</p>
      <Button onClick={() => router.push(`/pedidos/nova?mesa=${tableId}`)} className="gap-2 bg-orange-500 hover:bg-orange-600">
        <Plus className="h-4 w-4" /> Abrir Comanda
      </Button>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/mesas')} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
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
        <Button onClick={() => router.push(`/pdv?pedido=${order.id}`)} className="gap-2 bg-orange-500 hover:bg-orange-600">
          <CreditCard className="h-4 w-4" /> Fechar Conta
        </Button>
      </div>

      {/* Items list */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">Itens do Pedido</h2>
        </div>

        <div className="divide-y divide-slate-50 dark:divide-slate-800">
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
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-900/20">
                  <span className="text-sm font-bold text-orange-500">{item.quantity}×</span>
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
                <span className="font-semibold text-slate-900 dark:text-white w-20 text-right">
                  {formatCurrency(item.totalPrice)}
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* Totals */}
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.serviceCharge > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Taxa de serviço (10%)</span>
                <span>{formatCurrency(order.serviceCharge)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900 dark:border-slate-800 dark:text-white">
              <span>Total</span>
              <span className="text-lg">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PedidosPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>}>
      <PedidosContent />
    </Suspense>
  )
}
