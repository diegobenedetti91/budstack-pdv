'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ReceiptText, Loader2, Clock, DollarSign, Zap, CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'

export default function ContasPage() {
  const qc = useQueryClient()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const { data: contas = [], isLoading, refetch } = useQuery({
    queryKey: ['contas-solicitadas'],
    queryFn: () => api.get('/orders?billRequested=true').then(r => r.data),
    refetchInterval: 3000,
  })

  const marcarComoPago = useMutation({
    mutationFn: (orderId: string) =>
      api.post(`/orders/${orderId}/payments`, {
        method: 'CASH',
        amount: 999999, // Valor alto para cobrir o total
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas-solicitadas'] })
      setConfirmingId(null)
    },
  })

  const getTimeSince = (date: string) => {
    const now = new Date()
    const past = new Date(date)
    const seconds = Math.floor((now.getTime() - past.getTime()) / 1000)

    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Contas Solicitadas</h1>
        <p className="text-sm text-slate-500">Mesas aguardando pagamento</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Contas Pendentes</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {contas.length}
                </p>
              </div>
              <div className="rounded-xl bg-orange-100 p-3 dark:bg-orange-900/30">
                <ReceiptText className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Acumulado</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(contas.reduce((sum: number, c: any) => sum + Number(c.total ?? 0), 0))}
                </p>
              </div>
              <div className="rounded-xl bg-green-100 p-3 dark:bg-green-900/30">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contas List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : contas.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <ReceiptText className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
            <p className="text-slate-500">Nenhuma conta solicitada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contas.map((conta: any, i: number) => {
            const timeSince = getTimeSince(conta.billRequestedAt)
            const isConfirming = confirmingId === conta.id

            return (
              <motion.div
                key={conta.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-0 shadow-sm overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Mesa</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                          #{conta.table?.number || 'Retirada'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 dark:bg-orange-900/20">
                        <Clock className="h-3.5 w-3.5 text-orange-600" />
                        <span className="text-xs font-semibold text-orange-600">{timeSince}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Pedidos */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Pedidos</p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {conta.items?.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400">
                              {item.quantity}× {item.product?.name}
                            </span>
                            <span className="font-medium text-slate-900 dark:text-white">
                              {formatCurrency(Number(item.totalPrice))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total */}
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/30 p-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Total da Conta</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(Number(conta.total))}
                      </p>
                    </div>

                    {/* Action */}
                    <div>
                      {isConfirming ? (
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                            Confirmar pagamento?
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmingId(null)}
                              className="flex-1 px-3 py-1.5 text-xs font-semibold rounded text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => marcarComoPago.mutate(conta.id)}
                              disabled={marcarComoPago.isPending}
                              className="flex-1 px-3 py-1.5 text-xs font-semibold rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {marcarComoPago.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" />
                              ) : (
                                'Confirmar'
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmingId(conta.id)}
                          className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                        >
                          <Zap className="h-4 w-4" />
                          Ir para o Caixa
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
