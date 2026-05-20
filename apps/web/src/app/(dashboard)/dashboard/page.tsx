'use client'

import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingBag, UtensilsCrossed, TrendingUp, Ticket,
  Clock, CheckCircle2, AlertCircle, Loader2, ArrowRight, Flame,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const statusConfig = {
  OPEN:        { label: 'Aberto',    icon: Clock,         col: 'text-slate-400 dark:text-white/30'  },
  IN_PROGRESS: { label: 'Produzindo',icon: Flame,         col: 'text-blue-400'                      },
  READY:       { label: 'Pronto',    icon: CheckCircle2,  col: 'text-emerald-400'                   },
  CLOSED:      { label: 'Fechado',   icon: CheckCircle2,  col: 'text-blue-400'                      },
  DELIVERED:   { label: 'Entregue',  icon: CheckCircle2,  col: 'text-blue-400'                      },
  CANCELLED:   { label: 'Cancelado', icon: AlertCircle,   col: 'text-red-400'                       },
}

function elapsed(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h`
}

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const w = 72; const h = 28
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - ((v - min) / range) * h * 0.75 - h * 0.1,
  ])
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  const id = 'spark-fill'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-slate-100 dark:bg-white/[0.06]', className)} />
}

export default function DashboardPage() {
  const router = useRouter()

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['dashboard-report'],
    queryFn: () => api.get('/reports/dashboard').then((r) => r.data),
    refetchInterval: 60000,
  })

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => api.get('/tables').then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: activeOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'OPEN,IN_PROGRESS,READY'],
    queryFn: () => api.get('/orders?status=OPEN,IN_PROGRESS,READY').then((r) => r.data),
    refetchInterval: 10000,
  })

  const isLoading = reportLoading || tablesLoading || ordersLoading

  const summary = report?.summary ?? { totalOrders: 0, totalRevenue: 0, closedOrders: 0, avgTicket: 0 }
  const tList = tables as any[]
  const oList = activeOrders as any[]
  const occupiedTables = tList.filter((t) => t.status === 'OCCUPIED').length
  const totalTables = tList.length
  const occupancyPct = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0
  const closedPct = summary.totalOrders > 0 ? Math.round((summary.closedOrders / summary.totalOrders) * 100) : 0

  const pipeline = {
    OPEN:        oList.filter((o) => o.status === 'OPEN'),
    IN_PROGRESS: oList.filter((o) => o.status === 'IN_PROGRESS'),
    READY:       oList.filter((o) => o.status === 'READY'),
  }

  const sparkValues = oList.slice(0, 14).map((o) => o.total ?? 0)

  return (
    <div className="space-y-4">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Visão Geral</h1>
          <p className="text-xs text-slate-500 dark:text-white/30">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-cyan-500/10 px-3 py-1.5 ring-1 ring-cyan-500/20">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500" />
          <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Ao vivo</span>
        </div>
      </div>

      {/* ── Bento grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">

        {/* ── Revenue (2 cols) ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
          className="col-span-4 sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/[0.06] dark:bg-[#111113]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-white/25">
                Faturamento
              </p>
              {isLoading ? (
                <Skeleton className="mt-2 h-8 w-36" />
              ) : (
                <motion.p
                  key={summary.totalRevenue}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
                >
                  {formatCurrency(summary.totalRevenue)}
                </motion.p>
              )}
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 dark:text-white/25">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span>
                  Ticket médio{' '}
                  <strong className="text-slate-600 dark:text-white/60">
                    {formatCurrency(summary.avgTicket)}
                  </strong>
                </span>
              </div>
            </div>
            {sparkValues.length >= 2 && (
              <Sparkline
                values={sparkValues}
                className="mt-1 shrink-0 text-cyan-500 opacity-70 dark:opacity-50"
              />
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-[10px] text-slate-400 dark:text-white/25">
              <span>{summary.closedOrders} pedidos encerrados</span>
              <span>{closedPct}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full brand-gradient"
                initial={{ width: 0 }}
                animate={{ width: `${closedPct}%` }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
              />
            </div>
          </div>
        </motion.div>

        {/* ── Orders count (1 col) ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/[0.06] dark:bg-[#111113]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10">
            <ShoppingBag className="h-4 w-4 text-cyan-500" />
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-white/25">
            Pedidos hoje
          </p>
          {isLoading ? <Skeleton className="mt-1.5 h-7 w-14" /> : (
            <motion.p
              key={summary.totalOrders}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1 text-2xl font-bold text-slate-900 dark:text-white"
            >
              {summary.totalOrders}
            </motion.p>
          )}
          <p className="mt-0.5 text-xs text-slate-400 dark:text-white/25">{summary.closedOrders} encerrados</p>
        </motion.div>

        {/* ── Table mini-map (1 col) ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/[0.06] dark:bg-[#111113]"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-white/25">Mesas</p>
            <span className="text-xs font-bold text-cyan-500">{occupancyPct}%</span>
          </div>

          {tablesLoading ? (
            <div className="mt-3 grid grid-cols-5 gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-3 rounded-sm" />
              ))}
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1">
              {tList.slice(0, 20).map((t: any, i: number) => (
                <motion.div
                  key={t.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.02 }}
                  title={`Mesa ${t.number}`}
                  className={cn(
                    'h-3 w-3 rounded-sm',
                    t.status === 'OCCUPIED'  && 'bg-cyan-500',
                    t.status === 'AVAILABLE' && 'bg-emerald-500',
                    t.status === 'RESERVED'  && 'bg-blue-500',
                    t.status === 'INACTIVE'  && 'bg-slate-200 dark:bg-white/[0.08]',
                  )}
                />
              ))}
              {tList.length === 0 && (
                <p className="text-[10px] text-slate-400">Nenhuma mesa</p>
              )}
            </div>
          )}

          <p className="mt-2 text-xs text-slate-500 dark:text-white/30">
            <span className="font-semibold text-slate-700 dark:text-white/60">{occupiedTables}</span>
            /{totalTables} ocupadas
          </p>

          {/* Legend */}
          <div className="mt-2 flex gap-2 text-[9px] text-slate-400 dark:text-white/20">
            <span className="flex items-center gap-0.5"><span className="inline-block h-1.5 w-1.5 rounded-sm bg-emerald-500" /> Livre</span>
            <span className="flex items-center gap-0.5"><span className="inline-block h-1.5 w-1.5 rounded-sm bg-cyan-500" /> Ocupada</span>
          </div>
        </motion.div>

        {/* ── Active comandas (1 col) ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          className={cn(
            'col-span-2 md:col-span-1 rounded-2xl border p-5 transition-all',
            pipeline.READY.length > 0
              ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/[0.04] glow-green'
              : 'border-slate-200 bg-white dark:border-white/[0.06] dark:bg-[#111113]',
          )}
        >
          <div className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl',
            pipeline.READY.length > 0 ? 'bg-emerald-500/15' : 'bg-violet-500/10',
          )}>
            <Ticket className={cn('h-4 w-4', pipeline.READY.length > 0 ? 'text-emerald-500' : 'text-violet-500')} />
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-white/25">
            Comandas ativas
          </p>
          {ordersLoading ? <Skeleton className="mt-1.5 h-7 w-10" /> : (
            <motion.p
              key={oList.length}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1 text-2xl font-bold text-slate-900 dark:text-white"
            >
              {oList.length}
            </motion.p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10px]">
            <span className="flex items-center gap-0.5 text-slate-400 dark:text-white/25">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
              {pipeline.OPEN.length} abertos
            </span>
            <span className="flex items-center gap-0.5 text-cyan-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-500" />
              {pipeline.IN_PROGRESS.length} prod.
            </span>
            {pipeline.READY.length > 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {pipeline.READY.length} prontos!
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Order pipeline (3 cols) ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="col-span-4 md:col-span-3 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/[0.06] dark:bg-[#111113]"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-white/[0.05]">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Fluxo de Pedidos</p>
            <button
              onClick={() => router.push('/pedidos')}
              className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-cyan-500 dark:text-white/25 dark:hover:text-cyan-400"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {ordersLoading ? (
            <div className="flex h-36 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
            </div>
          ) : oList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <UtensilsCrossed className="mb-2 h-8 w-8 text-slate-200 dark:text-white/10" />
              <p className="text-sm text-slate-400 dark:text-white/20">Nenhuma comanda ativa</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-white/[0.05]">
              {(
                [
                  {
                    key: 'OPEN' as const,
                    label: 'Aberto',
                    dot: 'bg-slate-400',
                    textColor: 'text-slate-500 dark:text-white/40',
                    cardBase: 'border-slate-100 bg-slate-50/60 dark:border-white/[0.04] dark:bg-white/[0.03]',
                    cardHover: 'hover:border-cyan-200 hover:bg-cyan-50/30 dark:hover:border-cyan-500/20 dark:hover:bg-cyan-500/[0.04]',
                    colBg: '',
                  },
                  {
                    key: 'IN_PROGRESS' as const,
                    label: 'Produzindo',
                    dot: 'bg-blue-500 animate-pulse',
                    textColor: 'text-blue-500 dark:text-blue-400',
                    cardBase: 'border-blue-100 bg-blue-50/40 dark:border-blue-500/15 dark:bg-blue-500/[0.04]',
                    cardHover: 'hover:border-blue-300 dark:hover:border-blue-500/30',
                    colBg: '',
                  },
                  {
                    key: 'READY' as const,
                    label: 'Pronto',
                    dot: 'bg-emerald-500 animate-pulse',
                    textColor: 'text-emerald-600 dark:text-emerald-400',
                    cardBase: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/[0.05]',
                    cardHover: 'hover:border-emerald-400 dark:hover:border-emerald-500/40',
                    colBg: 'dark:bg-emerald-500/[0.02]',
                  },
                ]
              ).map(({ key, label, dot, textColor, cardBase, cardHover, colBg }) => {
                const orders = pipeline[key]
                return (
                  <div key={key} className={cn('min-h-[160px] p-3.5', colBg)}>
                    <div className="mb-3 flex items-center gap-1.5">
                      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
                      <span className={cn('text-xs font-semibold', textColor)}>{label}</span>
                      <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/[0.06] dark:text-white/35">
                        {orders.length}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {orders.slice(0, 5).map((order: any, i: number) => {
                        const tableLabel = order.table?.number
                          ? `Mesa ${order.table.number}`
                          : (order.customerName ?? 'Balcão')
                        return (
                          <motion.div
                            key={order.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => order.tableId && router.push(`/pedidos?mesa=${order.tableId}`)}
                            className={cn(
                              'rounded-xl border px-3 py-2 transition-colors',
                              cardBase,
                              order.tableId && `cursor-pointer ${cardHover}`,
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-800 dark:text-white/75">
                                {tableLabel}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-white/20">
                                {elapsed(order.createdAt)}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 dark:text-white/25">
                                {order.items?.length ?? 0} itens
                              </span>
                              <span className="text-xs font-bold text-slate-700 dark:text-white/60">
                                {formatCurrency(order.total)}
                              </span>
                            </div>
                          </motion.div>
                        )
                      })}

                      {orders.length > 5 && (
                        <p className="pt-1 text-center text-[10px] text-slate-300 dark:text-white/15">
                          +{orders.length - 5} mais
                        </p>
                      )}
                      {orders.length === 0 && (
                        <p className="pt-4 text-center text-[10px] text-slate-300 dark:text-white/10">
                          vazio
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}
