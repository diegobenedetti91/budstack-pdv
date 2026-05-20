'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, Banknote, QrCode, Wallet, Loader2, CheckCircle2,
  Plus, Minus, Printer, ArrowLeft, Split, Receipt, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, cn } from '@/lib/utils'
import { PaymentMethod } from '@budstack/types'

const paymentMethods = [
  { key: PaymentMethod.CASH, label: 'Dinheiro', icon: Banknote, color: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-400', activeColor: 'border-green-500 bg-green-500 text-white' },
  { key: PaymentMethod.CREDIT_CARD, label: 'Crédito', icon: CreditCard, color: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-400', activeColor: 'border-blue-500 bg-blue-500 text-white' },
  { key: PaymentMethod.DEBIT_CARD, label: 'Débito', icon: CreditCard, color: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/40 dark:bg-purple-900/10 dark:text-purple-400', activeColor: 'border-purple-500 bg-purple-500 text-white' },
  { key: PaymentMethod.PIX, label: 'PIX', icon: QrCode, color: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/40 dark:bg-teal-900/10 dark:text-teal-400', activeColor: 'border-teal-500 bg-teal-500 text-white' },
  { key: PaymentMethod.VOUCHER, label: 'Vale', icon: Wallet, color: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-900/10 dark:text-cyan-400', activeColor: 'border-cyan-500 bg-cyan-500 text-white' },
]

interface SplitEntry {
  id: string
  method: PaymentMethod
  amount: string
  cashReceived?: string
}

function PDVContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const qc = useQueryClient()
  const orderId = params.get('pedido')

  const [splits, setSplits] = useState<SplitEntry[]>([
    { id: '1', method: PaymentMethod.CASH, amount: '' },
  ])
  const [success, setSuccess] = useState(false)

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-pdv', orderId],
    queryFn: () => api.get(`/orders/${orderId}`).then((r) => r.data),
    enabled: !!orderId,
  })

  const totalPaid = splits.reduce((acc, s) => acc + (parseFloat(s.amount.replace(',', '.')) || 0), 0)
  const remaining = order ? Math.max(0, order.total - totalPaid) : 0
  const overpay = totalPaid > (order?.total ?? 0)

  const addSplit = () => {
    setSplits((prev) => [...prev, { id: String(Date.now()), method: PaymentMethod.CREDIT_CARD, amount: '' }])
  }

  const removeSplit = (id: string) => {
    if (splits.length === 1) return
    setSplits((prev) => prev.filter((s) => s.id !== id))
  }

  const updateSplit = (id: string, field: keyof SplitEntry, value: string) => {
    setSplits((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s))
  }

  const fillRemaining = (id: string) => {
    const otherPaid = splits.filter((s) => s.id !== id).reduce((acc, s) => acc + (parseFloat(s.amount.replace(',', '.')) || 0), 0)
    const fill = Math.max(0, (order?.total ?? 0) - otherPaid)
    updateSplit(id, 'amount', fill.toFixed(2).replace('.', ','))
  }

  const confirmPayment = useMutation({
    mutationFn: async () => {
      for (const split of splits) {
        const amount = parseFloat(split.amount.replace(',', '.'))
        if (!amount) continue
        const cashReceived = split.method === PaymentMethod.CASH && split.cashReceived
          ? parseFloat(split.cashReceived.replace(',', '.'))
          : undefined
        await api.post(`/orders/${orderId}/payments`, {
          method: split.method,
          amount,
          cashReceived,
        })
      }
    },
    onSuccess: () => {
      setSuccess(true)
      qc.invalidateQueries({ queryKey: ['orders'] })
      setTimeout(() => router.push('/mesas'), 2500)
    },
    onError: (err: any) => toast({
      title: 'Erro no pagamento',
      description: err?.response?.data?.message ?? 'Tente novamente.',
      variant: 'destructive',
    }),
  })

  if (!orderId) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <Receipt className="mb-3 h-14 w-14 opacity-30" />
      <p className="font-medium text-slate-500">Selecione um pedido para fechar</p>
      <Button onClick={() => router.push('/pedidos')} className="mt-4 gap-2 bg-cyan-500 hover:bg-cyan-600">
        Ver Pedidos
      </Button>
    </div>
  )

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /></div>

  if (success) return (
    <div className="flex flex-col items-center justify-center py-20">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/30">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-4 text-center">
        <p className="text-xl font-bold text-slate-900 dark:text-white">Pagamento Confirmado!</p>
        <p className="text-slate-500">Redirecionando para mesas...</p>
      </motion.div>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-112px)] gap-5 overflow-hidden">
      {/* LEFT: Order Summary */}
      <div className="flex w-80 shrink-0 flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs text-slate-400">Comanda #{order?.orderNumber}</p>
              <p className="font-bold text-slate-900 dark:text-white">Mesa {order?.table?.number ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
          {order?.items?.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {item.quantity}
              </span>
              <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{item.product?.name}</span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(item.totalPrice)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 p-4 dark:border-slate-800 space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span><span>{formatCurrency(order?.subtotal ?? 0)}</span>
          </div>
          {(order?.serviceCharge ?? 0) > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Taxa serviço</span><span>{formatCurrency(order?.serviceCharge)}</span>
            </div>
          )}
          {(order?.discount ?? 0) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Desconto</span><span>-{formatCurrency(order?.discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900 dark:border-slate-800 dark:text-white">
            <span>Total</span>
            <span className="text-xl text-cyan-600">{formatCurrency(order?.total ?? 0)}</span>
          </div>
        </div>
      </div>

      {/* RIGHT: Payment */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pagamento</h2>
              <p className="text-sm text-slate-500">
                {splits.length > 1 ? `Dividido em ${splits.length} partes` : 'Pagamento único'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addSplit} className="gap-1.5 border-cyan-200 text-cyan-600 hover:bg-cyan-50">
              <Split className="h-3.5 w-3.5" /> Dividir
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <AnimatePresence>
            {splits.map((split, i) => (
              <motion.div
                key={split.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {splits.length > 1 ? `Parte ${i + 1}` : 'Pagamento'}
                  </p>
                  {splits.length > 1 && (
                    <button onClick={() => removeSplit(split.id)} className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Methods */}
                <div className="mb-3 grid grid-cols-5 gap-1.5">
                  {paymentMethods.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => updateSplit(split.id, 'method', m.key)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-center transition-all text-xs font-medium',
                        split.method === m.key ? m.activeColor : m.color,
                      )}
                    >
                      <m.icon className="h-4 w-4" />
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Amount */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">R$</span>
                    <Input
                      value={split.amount}
                      onChange={(e) => updateSplit(split.id, 'amount', e.target.value)}
                      placeholder="0,00"
                      className="pl-9 text-right font-mono text-base font-bold"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => fillRemaining(split.id)} className="text-xs border-cyan-200 text-cyan-600 hover:bg-cyan-50 px-3">
                    Saldo
                  </Button>
                </div>

                {/* Cash received */}
                {split.method === PaymentMethod.CASH && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Recebido R$</span>
                      <Input
                        value={split.cashReceived ?? ''}
                        onChange={(e) => updateSplit(split.id, 'cashReceived', e.target.value)}
                        placeholder="0,00"
                        className="pl-24 text-right font-mono text-sm"
                      />
                    </div>
                    {split.cashReceived && parseFloat(split.cashReceived.replace(',', '.')) >= parseFloat(split.amount.replace(',', '.') || '0') && (
                      <p className="mt-1.5 text-right text-sm font-semibold text-green-600">
                        Troco: {formatCurrency(parseFloat(split.cashReceived.replace(',', '.')) - parseFloat(split.amount.replace(',', '.') || '0'))}
                      </p>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-5 dark:border-slate-800">
          <div className="mb-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-400">Total</p>
                <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(order?.total ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Pago</p>
                <p className={cn('font-bold', totalPaid >= (order?.total ?? 0) ? 'text-green-600' : 'text-slate-900 dark:text-white')}>{formatCurrency(totalPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{overpay ? 'Troco' : 'Restante'}</p>
                <p className={cn('font-bold', overpay ? 'text-green-600' : remaining > 0 ? 'text-red-500' : 'text-green-600')}>
                  {formatCurrency(overpay ? totalPaid - (order?.total ?? 0) : remaining)}
                </p>
              </div>
            </div>
          </div>

          {remaining > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-yellow-50 px-3 py-2 text-xs text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Faltam {formatCurrency(remaining)} para completar o pagamento
            </div>
          )}

          <Button
            size="lg"
            className="w-full gap-2 text-white shadow-lg hover:opacity-90" style={{ background: 'linear-gradient(135deg, #22D3EE 0%, #3B82F6 50%, #8B5CF6 100%)', boxShadow: '0 8px 24px rgba(6,182,212,0.25)' }}
            disabled={remaining > 0 || confirmPayment.isPending || splits.every((s) => !parseFloat(s.amount.replace(',', '.')))}
            onClick={() => confirmPayment.mutate()}
          >
            {confirmPayment.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            Confirmar Pagamento — {formatCurrency(order?.total ?? 0)}
          </Button>

          <Button variant="ghost" size="sm" className="mt-2 w-full gap-1.5 text-slate-500">
            <Printer className="h-3.5 w-3.5" /> Imprimir Pré-conta
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function PDVPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /></div>}>
      <PDVContent />
    </Suspense>
  )
}
