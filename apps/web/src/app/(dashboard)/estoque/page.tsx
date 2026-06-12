'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Package, TrendingDown, Bell, Check, Loader2, RefreshCw, X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'

export default function EstoquePage() {
  const qc = useQueryClient()
  const [showNotifications, setShowNotifications] = useState(false)

  const { data: lowStockProducts = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['stock', 'low-stock'],
    queryFn: () => api.get('/stock/low-stock').then(r => r.data),
    refetchInterval: 10000, // Atualizar a cada 10 segundos
  })

  const { data: notifications = [], isLoading: notificationsLoading, refetch: refetchNotifications } = useQuery({
    queryKey: ['stock', 'notifications'],
    queryFn: () => api.get('/stock/notifications').then(r => r.data),
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  })

  const unreadCount = notifications.filter((n: any) => !n.isRead).length

  const markAllAsRead = useMutation({
    mutationFn: () => api.patch('/stock/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock', 'notifications'] })
    },
  })

  const markOneAsRead = useMutation({
    mutationFn: (notificationId: string) => api.patch(`/stock/notifications/${notificationId}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock', 'notifications'] })
    },
  })

  const getStockStatus = (quantity: number, minimum: number) => {
    if (quantity === 0) return { label: 'Sem estoque', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: '❌' }
    if (quantity <= minimum) return { label: 'Estoque mínimo', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: '⚠️' }
    return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', icon: '✅' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Controle de Estoque</h1>
          <p className="text-sm text-slate-500">Monitore produtos com estoque baixo</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              refetchProducts()
              refetchNotifications()
            }}
            title="Atualizar dados imediatamente"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative"
          >
            <Bell className="h-4 w-4" />
            Notificações
            {unreadCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </Button>
          {unreadCount > 0 && (
            <Button
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              {markAllAsRead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Marcar como lido
            </Button>
          )}
        </div>
      </div>

      {/* Notificações */}
      {showNotifications && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="mb-4 font-semibold text-slate-900 dark:text-white">Notificações Recentes</h3>
          {notificationsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center text-sm text-slate-500">Nenhuma notificação</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {notifications.map((notif: any) => {
                const status = getStockStatus(notif.currentStock, notif.minimumStock)
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'flex items-center justify-between rounded-lg p-3 text-sm',
                      status.bg,
                      !notif.isRead && 'border-l-4 border-yellow-400',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>{status.icon}</span>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{notif.product.name}</p>
                        <p className={cn('text-xs', status.color)}>
                          {notif.currentStock === 0 ? 'Sem estoque' : `${notif.currentStock} un. (mínimo: ${notif.minimumStock})`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notif.isRead && <span className="h-2 w-2 rounded-full bg-yellow-400" />}
                      <button
                        onClick={() => markOneAsRead.mutate(notif.id)}
                        disabled={markOneAsRead.isPending}
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-white/30 hover:text-slate-600 dark:hover:text-slate-300"
                        title="Marcar como lido"
                      >
                        {markOneAsRead.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Produtos Baixo Estoque</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {lowStockProducts.filter((p: any) => p.stockQuantity > 0).length}
                </p>
              </div>
              <div className="rounded-xl bg-orange-100 p-3 dark:bg-orange-900/30">
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Sem Estoque</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {lowStockProducts.filter((p: any) => p.stockQuantity === 0).length}
                </p>
              </div>
              <div className="rounded-xl bg-red-100 p-3 dark:bg-red-900/30">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Notificações</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{unreadCount}</p>
              </div>
              <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-900/30">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Produtos com baixo estoque */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Produtos com Estoque Baixo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : lowStockProducts.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-2 text-slate-500">Todos os produtos estão com estoque normal</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Produto</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Categoria</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Estoque Atual</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Mínimo</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((product: any, i: number) => {
                    const status = getStockStatus(product.stockQuantity, product.stockMinimum)
                    return (
                      <motion.tr
                        key={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{product.name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{product.category.name}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn('font-semibold', status.color)}>
                            {product.stockQuantity} un.
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                          {product.stockMinimum} un.
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', status.bg, status.color)}>
                            {status.icon} {status.label}
                          </span>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
