'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, UtensilsCrossed, Users, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const stats = [
  { title: 'Pedidos Hoje', value: '47', icon: ShoppingBag, change: '+12%', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { title: 'Mesas Ocupadas', value: '8/16', icon: UtensilsCrossed, change: '50%', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { title: 'Faturamento', value: 'R$ 2.847', icon: TrendingUp, change: '+8%', color: 'text-green-500', bg: 'bg-green-500/10' },
  { title: 'Clientes', value: '124', icon: Users, change: '+5%', color: 'text-purple-500', bg: 'bg-purple-500/10' },
]

const recentOrders = [
  { id: 'P0042', table: 'Mesa 5', items: 3, total: 'R$ 89,90', status: 'IN_PROGRESS', time: '12 min' },
  { id: 'P0041', table: 'Mesa 2', items: 5, total: 'R$ 145,50', status: 'READY', time: '25 min' },
  { id: 'P0040', table: 'Mesa 8', items: 2, total: 'R$ 52,00', status: 'OPEN', time: '3 min' },
  { id: 'P0039', table: 'Balcão', items: 1, total: 'R$ 18,00', status: 'DELIVERED', time: '38 min' },
]

const statusConfig = {
  OPEN: { label: 'Aberto', icon: Clock, className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  IN_PROGRESS: { label: 'Produzindo', icon: AlertCircle, className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  READY: { label: 'Pronto', icon: CheckCircle2, className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  DELIVERED: { label: 'Entregue', icon: CheckCircle2, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Visão geral do dia — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                    <p className="mt-1 text-xs text-green-600 dark:text-green-400">{stat.change} hoje</p>
                  </div>
                  <div className={`rounded-xl p-3 ${stat.bg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Orders */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentOrders.map((order, i) => {
              const status = statusConfig[order.status as keyof typeof statusConfig]
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-xl border border-slate-100 p-4 dark:border-slate-800"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{order.id}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{order.table}</p>
                      <p className="text-xs text-slate-500">{order.items} itens · {order.time} atrás</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900 dark:text-white">{order.total}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                      <status.icon className="h-3 w-3" />
                      {status.label}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
