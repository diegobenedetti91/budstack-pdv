'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ReceiptText, Loader2, Clock, DollarSign, Zap, CheckCircle2, X, CreditCard, Banknote, QrCode,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'

const paymentMethods = [
  { key: 'CREDIT_CARD', label: 'Crédito', icon: CreditCard },
  { key: 'DEBIT_CARD', label: 'Débito', icon: CreditCard },
  { key: 'PIX', label: 'PIX', icon: QrCode },
  { key: 'CASH', label: 'Dinheiro', icon: Banknote },
]

export default function ContasPage() {
  const qc = useQueryClient()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [selectedForPayment, setSelectedForPayment] = useState<string | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)

  const { data: contas = [], isLoading, refetch } = useQuery({
    queryKey: ['contas-solicitadas'],
    queryFn: () => api.get('/orders?billRequested=true').then(r => r.data),
    refetchInterval: 3000,
  })

  const marcarComoPago = useMutation({
    mutationFn: (orderId: string) =>
      api.post(`/orders/${orderId}/payments`, {
        method: selectedPaymentMethod || 'CASH',
        amount: 999999,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas-solicitadas'] })
      setSelectedForPayment(null)
      setSelectedPaymentMethod(null)
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

  const contaSelecionada = contas.find((c: any) => c.id === selectedForPayment)

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
                    <button
                      onClick={() => setSelectedForPayment(conta.id)}
                      className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      Ir para o Caixa
                    </button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal de Pagamento */}
      <AnimatePresence>
        {selectedForPayment && contaSelecionada && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedForPayment(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl space-y-6 rounded-2xl bg-white p-6 dark:bg-slate-900"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Mesa #{contaSelecionada.table?.number || 'Retirada'}
                  </h2>
                  <p className="text-sm text-slate-500">Pedido #{contaSelecionada.orderNumber}</p>
                </div>
                <button
                  onClick={() => setSelectedForPayment(null)}
                  className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Itens */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {contaSelecionada.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{item.quantity}× {item.product?.name}</p>
                      {item.notes && <p className="text-xs text-slate-500">{item.notes}</p>}
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(Number(item.totalPrice))}
                    </p>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="text-sm text-slate-600 dark:text-slate-400">Total da Conta</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(Number(contaSelecionada.total))}
                </p>
              </div>

              {/* Métodos de Pagamento */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Forma de Pagamento</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.key}
                      onClick={() => setSelectedPaymentMethod(method.key)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-lg p-3 transition-all',
                        selectedPaymentMethod === method.key
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      )}
                    >
                      <method.icon className="h-5 w-5" />
                      <span className="text-xs font-semibold">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedForPayment(null)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => marcarComoPago.mutate(contaSelecionada.id)}
                  disabled={!selectedPaymentMethod || marcarComoPago.isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {marcarComoPago.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                  Confirmar Pagamento
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
