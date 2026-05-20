'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  TrendingUp, ShoppingBag, DollarSign, Loader2,
  Banknote, CreditCard, QrCode, BarChart3, ChefHat,
  TrendingDown, Percent, CalendarRange,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'

const paymentLabels: Record<string, { label: string; icon: typeof Banknote; color: string }> = {
  CASH:        { label: 'Dinheiro',  icon: Banknote,    color: 'bg-green-500'  },
  CREDIT_CARD: { label: 'Crédito',   icon: CreditCard,  color: 'bg-blue-500'   },
  DEBIT_CARD:  { label: 'Débito',    icon: CreditCard,  color: 'bg-purple-500' },
  PIX:         { label: 'PIX',       icon: QrCode,      color: 'bg-teal-500'   },
  VOUCHER:     { label: 'Vale',      icon: DollarSign,  color: 'bg-cyan-500'   },
  OTHER:       { label: 'Outros',    icon: DollarSign,  color: 'bg-slate-400'  },
}

type PeriodKey = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom'

const presets: { key: PeriodKey; label: string }[] = [
  { key: 'today',     label: 'Hoje' },
  { key: 'yesterday', label: 'Ontem' },
  { key: 'week',      label: 'Esta semana' },
  { key: 'month',     label: 'Este mês' },
  { key: 'year',      label: 'Este ano' },
  { key: 'custom',    label: 'Personalizado' },
]

function getPeriodDates(key: PeriodKey, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const endOfDay   = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

  if (key === 'custom' && customFrom && customTo) {
    return {
      from: startOfDay(new Date(customFrom + 'T00:00:00')).toISOString(),
      to:   endOfDay(new Date(customTo + 'T00:00:00')).toISOString(),
    }
  }
  if (key === 'today') return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() }
  if (key === 'yesterday') {
    const y = new Date(now); y.setDate(y.getDate() - 1)
    return { from: startOfDay(y).toISOString(), to: endOfDay(y).toISOString() }
  }
  if (key === 'week') {
    const mon = new Date(now)
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    return { from: startOfDay(mon).toISOString(), to: endOfDay(now).toISOString() }
  }
  if (key === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: first.toISOString(), to: endOfDay(now).toISOString() }
  }
  if (key === 'year') {
    const first = new Date(now.getFullYear(), 0, 1)
    return { from: first.toISOString(), to: endOfDay(now).toISOString() }
  }
  return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() }
}

function MiniBarChart({ data, maxValue, color = 'bg-cyan-400 group-hover:bg-cyan-500' }: {
  data: { label: string; value: number }[]
  maxValue: number
  color?: string
}) {
  return (
    <div className="flex h-28 items-end gap-1">
      {data.map((item, i) => {
        const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0
        return (
          <div key={i} className="group relative flex flex-1 flex-col items-center gap-1">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className={cn('w-full min-h-[2px] rounded-t-sm', color)}
            />
            <span className="text-[9px] text-slate-400 truncate w-full text-center">{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function MarginBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-slate-400">—</span>
  const good = pct >= 30
  const ok   = pct >= 15
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
      good ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
           : ok ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    )}>
      {pct.toFixed(1)}%
    </span>
  )
}

const inputCls = `h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700
  dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300
  focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500 transition-colors`

export default function RelatoriosPage() {
  const [period, setPeriod] = useState<PeriodKey>('today')
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(); return d.toISOString().slice(0, 10)
  })
  const [customTo, setCustomTo] = useState(() => {
    const d = new Date(); return d.toISOString().slice(0, 10)
  })

  const { from, to } = getPeriodDates(period, customFrom, customTo)

  const queryKey = period === 'custom' ? ['reports', 'custom', customFrom, customTo] : ['reports', period]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.get(`/reports/dashboard?from=${from}&to=${to}`).then((r) => r.data),
    refetchInterval: 60000,
    enabled: period !== 'custom' || (!!customFrom && !!customTo),
  })

  const summary = data?.summary
  const grossMarginPct: number | null = summary?.grossMarginPercent != null
    ? Number(summary.grossMarginPercent)
    : null

  const stats = [
    {
      title: 'Faturamento',
      value: formatCurrency(summary?.totalRevenue ?? 0),
      icon: TrendingUp,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      sub: `${summary?.closedOrders ?? 0} pedidos fechados`,
    },
    {
      title: 'Total de Pedidos',
      value: summary?.totalOrders ?? 0,
      icon: ShoppingBag,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      sub: `${summary?.cancelledOrders ?? 0} cancelado(s)`,
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(summary?.avgTicket ?? 0),
      icon: DollarSign,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      sub: 'por pedido fechado',
    },
    {
      title: 'Lucro Bruto',
      value: formatCurrency(summary?.grossProfit ?? 0),
      icon: Percent,
      color: grossMarginPct === null ? 'text-slate-400' : grossMarginPct >= 30 ? 'text-green-500' : grossMarginPct >= 15 ? 'text-yellow-500' : 'text-red-500',
      bg:    grossMarginPct === null ? 'bg-slate-400/10' : grossMarginPct >= 30 ? 'bg-green-500/10' : grossMarginPct >= 15 ? 'bg-yellow-500/10' : 'bg-red-500/10',
      sub: grossMarginPct !== null ? `Margem ${grossMarginPct.toFixed(1)}%` : 'Cadastre preço de custo',
    },
  ]

  // Gráficos
  const hourlyData = Array.from({ length: 24 }, (_, h) => {
    const found = data?.hourly?.find((i: any) => i.hour === h)
    return { label: `${String(h).padStart(2, '0')}h`, value: found?.revenue ?? 0 }
  }).filter((_, i) => i >= 8 && i <= 23)
  const maxHourly = Math.max(...hourlyData.map((d) => d.value), 1)

  const dailyData = (data?.daily ?? []).map((d: any) => ({
    label: new Date(d.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    value: d.revenue,
  }))
  const maxDaily = Math.max(...dailyData.map((d: any) => d.value), 1)

  const byMethod = Object.entries(data?.byMethod ?? {}) as [string, number][]
  const totalPayments = byMethod.reduce((acc, [, v]) => acc + v, 0)

  const topItems: any[] = data?.topItems ?? []

  return (
    <div className="space-y-6">

      {/* ── Header + filtros ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Relatórios</h1>
          <p className="text-sm text-slate-500">Análise de vendas, desempenho e margem</p>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          {/* Presets */}
          <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            {presets.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  period === p.key
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                )}
              >
                {p.key === 'custom' && <CalendarRange className="h-3 w-3" />}
                {p.label}
              </button>
            ))}
          </div>

          {/* Date range inputs — só aparece no modo personalizado */}
          {period === 'custom' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                className={inputCls}
              />
              <span className="text-xs text-slate-400">até</span>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setCustomTo(e.target.value)}
                className={inputCls}
              />
            </motion.div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </div>
      ) : (
        <>
          {/* ── Stats ─────────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div key={stat.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{stat.sub}</p>
                      </div>
                      <div className={cn('rounded-xl p-3', stat.bg)}>
                        <stat.icon className={cn('h-6 w-6', stat.color)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">

            {/* ── Receita por hora ───────────────────────────────────── */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-cyan-500" /> Receita por Hora
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MiniBarChart data={hourlyData} maxValue={maxHourly} />
              </CardContent>
            </Card>

            {/* ── Receita diária (só exibe quando tem múltiplos dias) ── */}
            {dailyData.length > 1 ? (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-cyan-500" /> Receita Diária
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MiniBarChart data={dailyData} maxValue={maxDaily} />
                </CardContent>
              </Card>
            ) : null}

            {/* ── Formas de pagamento ────────────────────────────────── */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4 text-cyan-500" /> Formas de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {byMethod.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">Sem pagamentos no período</p>
                ) : (
                  <div className="space-y-3">
                    {byMethod.sort(([, a], [, b]) => b - a).map(([method, value]) => {
                      const cfg = paymentLabels[method] ?? paymentLabels.OTHER
                      const pct = totalPayments > 0 ? (value / totalPayments) * 100 : 0
                      return (
                        <div key={method}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                              <cfg.icon className="h-3.5 w-3.5 text-slate-400" />
                              {cfg.label}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(value)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <motion.div
                              className={cn('h-full rounded-full', cfg.color)}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6 }}
                            />
                          </div>
                          <p className="mt-0.5 text-right text-xs text-slate-400">{pct.toFixed(1)}%</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Produtos Mais Vendidos + Margem ───────────────────── */}
            <Card className="border-0 shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ChefHat className="h-4 w-4 text-cyan-500" /> Produtos Mais Vendidos
                  </CardTitle>
                  <span className="text-xs text-slate-400">Receita · Custo · Lucro · Margem</span>
                </div>
              </CardHeader>
              <CardContent>
                {!topItems.length ? (
                  <p className="py-6 text-center text-sm text-slate-400">Sem vendas no período</p>
                ) : (
                  <div className="space-y-0 divide-y divide-slate-50 dark:divide-slate-800">
                    {topItems.map((item: any, i: number) => (
                      <motion.div
                        key={item.productId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 py-3"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {i + 1}
                        </span>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                          {item.imageUrl
                            ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                            : <ChefHat className="h-4 w-4 text-slate-300" />
                          }
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-slate-400">{item.quantity}× vendido{item.quantity !== 1 ? 's' : ''}</p>
                        </div>

                        {/* Métricas financeiras */}
                        <div className="hidden sm:flex items-center gap-6 text-right">
                          <div>
                            <p className="text-xs text-slate-400">Receita</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item.revenue)}</p>
                          </div>
                          {item.cost > 0 ? (
                            <>
                              <div>
                                <p className="text-xs text-slate-400">Custo</p>
                                <p className="text-sm font-semibold text-red-500">{formatCurrency(item.cost)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400">Lucro</p>
                                <p className={cn('text-sm font-bold', item.profit >= 0 ? 'text-green-600' : 'text-red-500')}>
                                  {formatCurrency(item.profit)}
                                </p>
                              </div>
                            </>
                          ) : (
                            <div>
                              <p className="text-xs text-slate-400">Custo</p>
                              <p className="text-xs text-slate-400">não cadastrado</p>
                            </div>
                          )}
                          <MarginBadge pct={item.marginPercent} />
                        </div>

                        {/* Mobile: só receita + margem */}
                        <div className="flex sm:hidden flex-col items-end gap-1">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item.revenue)}</p>
                          <MarginBadge pct={item.marginPercent} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Legenda de margem */}
                {topItems.some((i: any) => i.marginPercent !== null) && (
                  <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <p className="w-full text-xs text-slate-400">Referência de margem:</p>
                    {[
                      { label: '≥ 30% — Ótima', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
                      { label: '15–29% — Regular', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
                      { label: '< 15% — Baixa', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
                    ].map((r) => (
                      <span key={r.label} className={cn('rounded-full px-2.5 py-1 text-xs font-medium', r.cls)}>{r.label}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </>
      )}
    </div>
  )
}
