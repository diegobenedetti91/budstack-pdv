'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  TrendingUp, ShoppingBag, Users, DollarSign, Loader2,
  Banknote, CreditCard, QrCode, BarChart3, ChefHat,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'

const paymentLabels: Record<string, { label: string; icon: typeof Banknote; color: string }> = {
  CASH:        { label: 'Dinheiro',  icon: Banknote,    color: 'bg-green-500'  },
  CREDIT_CARD: { label: 'Crédito',   icon: CreditCard,  color: 'bg-blue-500'   },
  DEBIT_CARD:  { label: 'Débito',    icon: CreditCard,  color: 'bg-purple-500' },
  PIX:         { label: 'PIX',       icon: QrCode,      color: 'bg-teal-500'   },
  VOUCHER:     { label: 'Vale',      icon: DollarSign,  color: 'bg-orange-500' },
  OTHER:       { label: 'Outros',    icon: DollarSign,  color: 'bg-slate-400'  },
}

const periods = [
  { key: 'today',   label: 'Hoje' },
  { key: 'week',    label: '7 dias' },
  { key: 'month',   label: '30 dias' },
]

function getPeriodDates(key: string): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString()
  if (key === 'today') {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    return { from, to }
  }
  if (key === 'week') {
    const from = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    return { from, to }
  }
  const from = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  return { from, to }
}

function MiniBarChart({ data, maxValue }: { data: { label: string; value: number }[]; maxValue: number }) {
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
              className="w-full min-h-[2px] rounded-t-sm bg-orange-400 group-hover:bg-orange-500"
            />
            <span className="text-[9px] text-slate-400 truncate w-full text-center">{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function RelatoriosPage() {
  const [period, setPeriod] = useState('today')
  const { from, to } = getPeriodDates(period)

  const { data, isLoading } = useQuery({
    queryKey: ['reports', period],
    queryFn: () => api.get(`/reports/dashboard?from=${from}&to=${to}`).then((r) => r.data),
    refetchInterval: 60000,
  })

  const stats = [
    { title: 'Faturamento', value: formatCurrency(data?.summary?.totalRevenue ?? 0), icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10', sub: `${data?.summary?.closedOrders ?? 0} pedidos fechados` },
    { title: 'Total de Pedidos', value: data?.summary?.totalOrders ?? 0, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10', sub: `${data?.summary?.cancelledOrders ?? 0} cancelado(s)` },
    { title: 'Ticket Médio', value: formatCurrency(data?.summary?.avgTicket ?? 0), icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-500/10', sub: 'por pedido fechado' },
  ]

  // Receita por hora (para o gráfico)
  const hourlyData = Array.from({ length: 24 }, (_, h) => {
    const found = data?.hourly?.find((i: any) => i.hour === h)
    return { label: `${String(h).padStart(2, '0')}h`, value: found?.revenue ?? 0 }
  }).filter((_, i) => i >= 8 && i <= 23)

  const maxHourly = Math.max(...hourlyData.map((d) => d.value), 1)

  // Diário
  const dailyData = (data?.daily ?? []).map((d: any) => ({
    label: new Date(d.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    value: d.revenue,
  }))
  const maxDaily = Math.max(...dailyData.map((d: any) => d.value), 1)

  // Métodos de pagamento
  const byMethod = Object.entries(data?.byMethod ?? {}) as [string, number][]
  const totalPayments = byMethod.reduce((acc, [, v]) => acc + v, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Relatórios</h1>
          <p className="text-sm text-slate-500">Análise de vendas e desempenho</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn('rounded-lg px-4 py-1.5 text-sm font-medium transition-colors', period === p.key ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            {stats.map((stat, i) => (
              <motion.div key={stat.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
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
            {/* Receita por hora */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-orange-500" /> Receita por Hora
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MiniBarChart data={hourlyData} maxValue={maxHourly} />
              </CardContent>
            </Card>

            {/* Receita diária */}
            {period !== 'today' && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-orange-500" /> Receita Diária
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MiniBarChart data={dailyData} maxValue={maxDaily} />
                </CardContent>
              </Card>
            )}

            {/* Meios de pagamento */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4 text-orange-500" /> Formas de Pagamento
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

            {/* Top produtos */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ChefHat className="h-4 w-4 text-orange-500" /> Produtos Mais Vendidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.topItems?.length ? (
                  <p className="py-6 text-center text-sm text-slate-400">Sem vendas no período</p>
                ) : (
                  <div className="space-y-2">
                    {data.topItems.slice(0, 8).map((item: any, i: number) => (
                      <motion.div
                        key={item.productId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {i + 1}
                        </span>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                          {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : <ChefHat className="h-4 w-4 text-slate-300" />}
                        </div>
                        <span className="flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{item.quantity}×</p>
                          <p className="text-xs text-slate-400">{formatCurrency(item.revenue)}</p>
                        </div>
                      </motion.div>
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
