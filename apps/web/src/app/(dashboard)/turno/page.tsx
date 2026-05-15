'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign, Clock, CheckCircle2, XCircle, Loader2,
  Banknote, CreditCard, QrCode, TrendingUp, X,
  CalendarClock, ReceiptText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

const methodLabels: Record<string, { label: string; icon: typeof Banknote; color: string }> = {
  CASH: { label: 'Dinheiro', icon: Banknote, color: 'text-green-500' },
  CREDIT_CARD: { label: 'Crédito', icon: CreditCard, color: 'text-blue-500' },
  DEBIT_CARD: { label: 'Débito', icon: CreditCard, color: 'text-purple-500' },
  PIX: { label: 'PIX', icon: QrCode, color: 'text-teal-500' },
  VOUCHER: { label: 'Vale', icon: DollarSign, color: 'text-orange-500' },
}

function OpenShiftModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [balance, setBalance] = useState('')
  const [notes, setNotes] = useState('')

  const openMutation = useMutation({
    mutationFn: () => api.post('/shifts/open', { openingBalance: Number(balance), notes: notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift-current'] })
      toast({ title: 'Caixa aberto com sucesso!' })
      onClose()
    },
    onError: (e: any) => toast({ title: e.response?.data?.message ?? 'Erro ao abrir caixa', variant: 'destructive' }),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">Abrir Caixa</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Saldo de abertura (dinheiro em caixa)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="pl-9"
                placeholder="0,00"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observações (opcional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Caixa aberto para turno da manhã" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600"
              disabled={openMutation.isPending || !balance}
              onClick={() => openMutation.mutate()}
            >
              {openMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Abrir Caixa
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function CloseShiftModal({ shiftId, onClose }: { shiftId: string; onClose: () => void }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [balance, setBalance] = useState('')
  const [notes, setNotes] = useState('')

  const closeMutation = useMutation({
    mutationFn: () => api.post(`/shifts/${shiftId}/close`, { closingBalance: Number(balance), notes: notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift-current'] })
      qc.invalidateQueries({ queryKey: ['shifts-history'] })
      toast({ title: 'Caixa fechado!' })
      onClose()
    },
    onError: (e: any) => toast({ title: e.response?.data?.message ?? 'Erro ao fechar caixa', variant: 'destructive' }),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">Fechar Caixa</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Saldo contado no fechamento</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="pl-9"
                placeholder="0,00"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observações (opcional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Conferido com responsável" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button
              className="flex-1 bg-red-500 hover:bg-red-600"
              disabled={closeMutation.isPending || !balance}
              onClick={() => closeMutation.mutate()}
            >
              {closeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Fechar Caixa
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function TurnoPage() {
  const [modal, setModal] = useState<'open' | 'close' | null>(null)

  const { data: current, isLoading: loadingCurrent } = useQuery({
    queryKey: ['shift-current'],
    queryFn: () => api.get('/shifts/current').then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: summary } = useQuery({
    queryKey: ['shift-summary', current?.id],
    queryFn: () => api.get(`/shifts/${current.id}/summary`).then((r) => r.data),
    enabled: !!current?.id,
    refetchInterval: 60000,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['shifts-history'],
    queryFn: () => api.get('/shifts').then((r) => r.data),
  })

  const elapsed = current
    ? Math.floor((Date.now() - new Date(current.openedAt).getTime()) / 60000)
    : 0

  const hours = Math.floor(elapsed / 60)
  const mins = elapsed % 60

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Turno de Caixa</h1>
          <p className="text-sm text-slate-500">Controle de abertura e fechamento do caixa</p>
        </div>
        {!loadingCurrent && (
          current ? (
            <Button variant="outline" className="gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400" onClick={() => setModal('close')}>
              <XCircle className="h-4 w-4" /> Fechar Caixa
            </Button>
          ) : (
            <Button className="gap-2 bg-green-500 hover:bg-green-600" onClick={() => setModal('open')}>
              <CheckCircle2 className="h-4 w-4" /> Abrir Caixa
            </Button>
          )
        )}
      </div>

      {loadingCurrent ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
      ) : current ? (
        <>
          {/* Status do turno atual */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-sm bg-green-50 dark:bg-green-900/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-green-600">Caixa Aberto</p>
                    <p className="font-bold text-slate-900 dark:text-white">{current.user?.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Tempo aberto</p>
                    <p className="font-bold text-slate-900 dark:text-white">{hours}h {mins}min</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
                    <Banknote className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Saldo abertura</p>
                    <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(current.openingBalance)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Total vendido</p>
                    <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(summary?.summary?.totalRevenue ?? 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalhes do turno */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Resumo de pedidos */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="h-4 w-4 text-orange-500" /> Resumo de Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                  <span className="text-sm text-slate-500">Total de pedidos</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{summary?.summary?.totalOrders ?? 0}</span>
                </div>
                <div className="flex justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                  <span className="text-sm text-slate-500">Pedidos fechados</span>
                  <span className="font-semibold text-green-600">{summary?.summary?.closedOrders ?? 0}</span>
                </div>
                <div className="flex justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                  <span className="text-sm text-slate-500">Saldo esperado em caixa</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(summary?.summary?.expectedBalance ?? current.openingBalance)}</span>
                </div>
                <p className="text-xs text-slate-400">Aberto em {new Date(current.openedAt).toLocaleString('pt-BR')}</p>
              </CardContent>
            </Card>

            {/* Por método */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4 text-orange-500" /> Vendas por Forma de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!summary?.summary?.byMethod || Object.keys(summary.summary.byMethod).length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">Nenhuma venda registrada ainda</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(summary.summary.byMethod as Record<string, number>)
                      .sort(([, a], [, b]) => b - a)
                      .map(([method, value]) => {
                        const cfg = methodLabels[method] ?? methodLabels.CASH
                        return (
                          <div key={method} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2">
                              <cfg.icon className={cn('h-4 w-4', cfg.color)} />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{cfg.label}</span>
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(value)}</span>
                          </div>
                        )
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-slate-300 dark:border-slate-700"
        >
          <DollarSign className="mb-4 h-16 w-16" />
          <p className="text-xl font-bold text-slate-400">Caixa Fechado</p>
          <p className="mt-1 text-sm text-slate-400">Abra o caixa para iniciar o atendimento</p>
          <Button className="mt-6 gap-2 bg-green-500 hover:bg-green-600" onClick={() => setModal('open')}>
            <CheckCircle2 className="h-4 w-4" /> Abrir Caixa
          </Button>
        </motion.div>
      )}

      {/* Histórico */}
      {history.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-orange-500" /> Histórico de Turnos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.slice(0, 10).map((shift: any) => (
                <div
                  key={shift.id}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-4 py-3 text-sm',
                    !shift.closedAt ? 'bg-green-50 dark:bg-green-900/10' : 'bg-slate-50 dark:bg-slate-800/50',
                  )}
                >
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{shift.user?.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(shift.openedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      {shift.closedAt && ` → ${new Date(shift.closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {shift.closedAt ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">Fechado</span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-600 dark:bg-green-900/30 dark:text-green-400">Aberto</span>
                    )}
                    {shift.closingBalance != null && (
                      <p className="mt-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">{formatCurrency(shift.closingBalance)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {modal === 'open' && <OpenShiftModal onClose={() => setModal(null)} />}
        {modal === 'close' && current && <CloseShiftModal shiftId={current.id} onClose={() => setModal(null)} />}
      </AnimatePresence>
    </div>
  )
}
