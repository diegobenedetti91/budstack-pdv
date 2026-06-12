'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, DollarSign, Target, Calendar, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'

export default function DrePage() {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)

  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0])

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dre-summary', startDate, endDate],
    queryFn: () =>
      api.get(`/reports/dre/summary?startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z`).then((r) => r.data),
  })

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['dre-products', startDate, endDate],
    queryFn: () =>
      api.get(`/reports/dre/products?startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z`).then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">DRE - Demonstração de Resultado</h1>
        <p className="text-sm text-slate-500">Análise de receita, custos e lucros</p>
      </div>

      <div className="flex gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">De:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Até:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {summaryLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Receita Bruta</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(summary?.receita || 0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-900/30">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Custo Total</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(summary?.custo || 0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-orange-100 p-3 dark:bg-orange-900/30">
                    <TrendingDown className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Lucro Líquido</p>
                    <p className={cn('mt-2 text-2xl font-bold', (summary?.lucroLiquido || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {formatCurrency(summary?.lucroLiquido || 0)}
                    </p>
                  </div>
                  <div className={cn('rounded-xl p-3', (summary?.lucroLiquido || 0) >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
                    <TrendingUp className={cn('h-6 w-6', (summary?.lucroLiquido || 0) >= 0 ? 'text-green-600' : 'text-red-600')} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Margem (%)</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                      {(summary?.margemLucro || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-purple-100 p-3 dark:bg-purple-900/30">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Ticket Médio</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(summary?.ticketMedio || 0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-cyan-100 p-3 dark:bg-cyan-900/30">
                    <Calendar className="h-6 w-6 text-cyan-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Top 10 Produtos (por Lucro)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Produto</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Qtd</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Receita</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Custo</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Lucro</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {(products || []).slice(0, 10).map((p: any) => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{p.nome}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{p.quantidade}</td>
                      <td className="px-4 py-3 text-right text-blue-600 font-semibold">{formatCurrency(p.receita)}</td>
                      <td className="px-4 py-3 text-right text-orange-600 font-semibold">{formatCurrency(p.custo)}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatCurrency(p.lucro)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{p.margem.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
