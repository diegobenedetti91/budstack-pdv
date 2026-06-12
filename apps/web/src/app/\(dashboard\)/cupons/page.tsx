'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Edit2, ToggleLeft, ToggleRight, Ticket, Calendar,
  DollarSign, Gift, Percent, AlertCircle, Check, X, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, cn } from '@/lib/utils'
import axios from 'axios'

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1' })

interface Coupon {
  id: string
  code: string
  description?: string
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_ITEM'
  discountValue: number
  maxUses?: number
  currentUses: number
  minOrderValue?: number
  maxDiscount?: number
  validFrom: string
  validUntil: string
  isActive: boolean
  createdAt: string
}

export default function CuponsPage() {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Coupon>>({
    discountType: 'PERCENTAGE',
  })

  const qc = useQueryClient()

  const { data: coupons, isLoading } = useQuery<Coupon[]>({
    queryKey: ['coupons'],
    queryFn: async () => {
      const { data } = await api.get('/coupons')
      return data
    },
    refetchInterval: 30000,
  })

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Coupon>) => {
      await api.post('/coupons', data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] })
      setIsCreating(false)
      setFormData({ discountType: 'PERCENTAGE' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; payload: Partial<Coupon> }) => {
      await api.patch(`/coupons/${data.id}`, data.payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] })
      setEditingId(null)
      setFormData({ discountType: 'PERCENTAGE' })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/coupons/${id}/toggle`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/coupons/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const isExpired = (coupon: Coupon) => new Date(coupon.validUntil) < new Date()
  const isActive = (coupon: Coupon) => coupon.isActive && !isExpired(coupon)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin">
          <RefreshCw className="h-8 w-8 text-cyan-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cupons e Promoções</h1>
          <p className="text-sm text-slate-400">{coupons?.length ?? 0} cupons cadastrados</p>
        </div>
        <Button
          onClick={() => {
            setIsCreating(!isCreating)
            setEditingId(null)
            setFormData({ discountType: 'PERCENTAGE' })
          }}
          className="gap-2 bg-cyan-600 hover:bg-cyan-700"
        >
          <Plus className="h-4 w-4" />
          Novo Cupom
        </Button>
      </div>

      {/* Formulário */}
      <AnimatePresence>
        {(isCreating || editingId) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-6"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Código (ex: DESCONTO10)"
                  value={formData.code ?? ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400"
                  required
                />
                <input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={formData.description ?? ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white"
                >
                  <option value="PERCENTAGE">Percentual (%)</option>
                  <option value="FIXED_AMOUNT">Valor Fixo (R$)</option>
                  <option value="FREE_ITEM">Item Grátis</option>
                </select>

                <input
                  type="number"
                  placeholder="Valor de desconto"
                  min="0"
                  step="0.01"
                  value={formData.discountValue ?? ''}
                  onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400"
                  required
                />

                <input
                  type="number"
                  placeholder="Usos máximos (opcional)"
                  min="1"
                  value={formData.maxUses ?? ''}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value ? Number(e.target.value) : undefined })}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Valor mínimo do pedido (opcional)"
                  min="0"
                  step="0.01"
                  value={formData.minOrderValue ?? ''}
                  onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value ? Number(e.target.value) : undefined })}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400"
                />

                <input
                  type="number"
                  placeholder="Desconto máximo (opcional)"
                  min="0"
                  step="0.01"
                  value={formData.maxDiscount ?? ''}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value ? Number(e.target.value) : undefined })}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="datetime-local"
                  value={formData.validFrom ? new Date(formData.validFrom).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white"
                  required
                />
                <input
                  type="datetime-local"
                  value={formData.validUntil ? new Date(formData.validUntil).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700 flex-1">
                  {editingId ? 'Atualizar' : 'Criar'} Cupom
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false)
                    setEditingId(null)
                    setFormData({ discountType: 'PERCENTAGE' })
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de cupons */}
      <div className="grid gap-4">
        {coupons && coupons.length > 0 ? (
          coupons.map((coupon) => (
            <motion.div
              key={coupon.id}
              className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 hover:bg-slate-700/30 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-5 w-5 text-cyan-400" />
                      <code className="font-bold text-white text-lg">{coupon.code}</code>
                    </div>
                    {isExpired(coupon) && (
                      <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                        Expirado
                      </span>
                    )}
                    {!isExpired(coupon) && !coupon.isActive && (
                      <span className="px-2 py-1 rounded-full bg-slate-600/50 text-slate-300 text-xs font-medium">
                        Inativo
                      </span>
                    )}
                    {isActive(coupon) && (
                      <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                        Ativo
                      </span>
                    )}
                  </div>

                  <p className="text-slate-300 mb-3">{coupon.description || '—'}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-slate-400">Tipo</p>
                      <p className="font-semibold text-cyan-400 flex items-center gap-1">
                        {coupon.discountType === 'PERCENTAGE' && (
                          <>
                            <Percent className="h-4 w-4" /> {coupon.discountValue}%
                          </>
                        )}
                        {coupon.discountType === 'FIXED_AMOUNT' && (
                          <>
                            <DollarSign className="h-4 w-4" /> {formatCurrency(coupon.discountValue)}
                          </>
                        )}
                        {coupon.discountType === 'FREE_ITEM' && (
                          <>
                            <Gift className="h-4 w-4" /> Grátis
                          </>
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-400">Usos</p>
                      <p className="font-semibold text-white">
                        {coupon.currentUses}
                        {coupon.maxUses && `/${coupon.maxUses}`}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-400">Válido até</p>
                      <p className="font-semibold text-white">
                        {new Date(coupon.validUntil).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    {coupon.minOrderValue && (
                      <div>
                        <p className="text-slate-400">Mín. pedido</p>
                        <p className="font-semibold text-white">
                          {formatCurrency(Number(coupon.minOrderValue))}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-auto">
                  <button
                    onClick={() => toggleMutation.mutate(coupon.id)}
                    className="p-2 rounded-lg hover:bg-slate-700 transition"
                    title={coupon.isActive ? 'Desativar' : 'Ativar'}
                  >
                    {coupon.isActive ? (
                      <ToggleRight className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-slate-500" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setEditingId(coupon.id)
                      setIsCreating(false)
                      setFormData(coupon)
                    }}
                    className="p-2 rounded-lg hover:bg-slate-700 transition"
                    title="Editar"
                  >
                    <Edit2 className="h-5 w-5 text-cyan-400" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Deletar "${coupon.code}"?`)) {
                        deleteMutation.mutate(coupon.id)
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-slate-700 transition"
                    title="Deletar"
                  >
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="rounded-lg border border-slate-700 border-dashed p-8 text-center">
            <Ticket className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Nenhum cupom criado ainda</p>
          </div>
        )}
      </div>
    </div>
  )
}
