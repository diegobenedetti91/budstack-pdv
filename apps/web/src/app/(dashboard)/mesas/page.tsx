'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Plus, Clock, CheckCircle2, XCircle, Coffee,
  UtensilsCrossed, MoreHorizontal, Loader2, QrCode,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Table {
  id: string
  number: number
  name?: string
  capacity: number
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'INACTIVE'
  section?: string
}

const statusConfig = {
  AVAILABLE: {
    label: 'Disponível',
    icon: CheckCircle2,
    bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    iconColor: 'text-emerald-500',
  },
  OCCUPIED: {
    label: 'Ocupada',
    icon: UtensilsCrossed,
    bg: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    dot: 'bg-orange-500',
    iconColor: 'text-orange-500',
  },
  RESERVED: {
    label: 'Reservada',
    icon: Clock,
    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    dot: 'bg-blue-500',
    iconColor: 'text-blue-500',
  },
  INACTIVE: {
    label: 'Inativa',
    icon: XCircle,
    bg: 'bg-slate-50 border-slate-200 dark:bg-slate-900/20 dark:border-slate-800',
    badge: 'bg-slate-100 text-slate-500 dark:bg-slate-900/30 dark:text-slate-500',
    dot: 'bg-slate-400',
    iconColor: 'text-slate-400',
  },
}

export default function MesasPage() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<string>('ALL')
  const [showNewTable, setShowNewTable] = useState(false)
  const [newTableNumber, setNewTableNumber] = useState('')

  const { data: tables = [], isLoading } = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn: () => api.get('/tables').then((r) => r.data),
    refetchInterval: 15000,
  })

  const createTable = useMutation({
    mutationFn: (number: number) => api.post('/tables', { number, capacity: 4 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      setShowNewTable(false)
      setNewTableNumber('')
      toast({ title: 'Mesa criada!' })
    },
  })

  const counts = {
    ALL: tables.length,
    AVAILABLE: tables.filter((t) => t.status === 'AVAILABLE').length,
    OCCUPIED: tables.filter((t) => t.status === 'OCCUPIED').length,
    RESERVED: tables.filter((t) => t.status === 'RESERVED').length,
  }

  const filtered = filter === 'ALL' ? tables : tables.filter((t) => t.status === filter)

  const handleTableClick = (table: Table) => {
    if (table.status === 'AVAILABLE') {
      router.push(`/pedidos/nova?mesa=${table.id}&numero=${table.number}`)
    } else if (table.status === 'OCCUPIED') {
      router.push(`/pedidos?mesa=${table.id}`)
    }
  }

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mesas</h1>
          <p className="text-sm text-slate-500">{counts.OCCUPIED} de {counts.ALL} mesas ocupadas</p>
        </div>
        <Button onClick={() => setShowNewTable(true)} className="gap-2 bg-orange-500 hover:bg-orange-600 shadow-sm shadow-orange-500/25">
          <Plus className="h-4 w-4" /> Nova Mesa
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'ALL', label: 'Todas' },
          { key: 'AVAILABLE', label: 'Disponíveis' },
          { key: 'OCCUPIED', label: 'Ocupadas' },
          { key: 'RESERVED', label: 'Reservadas' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all',
              filter === f.key
                ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/25'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-200 hover:text-orange-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300',
            )}
          >
            {f.label}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
              filter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
            )}>
              {counts[f.key as keyof typeof counts] ?? counts.ALL}
            </span>
          </button>
        ))}
      </div>

      {/* Ocupation bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-2.5 dark:bg-slate-800">
          <motion.div
            className="h-full rounded-full bg-orange-500"
            initial={{ width: 0 }}
            animate={{ width: `${counts.ALL > 0 ? (counts.OCCUPIED / counts.ALL) * 100 : 0}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-12 text-right">
          {counts.ALL > 0 ? Math.round((counts.OCCUPIED / counts.ALL) * 100) : 0}%
        </span>
        <span className="text-xs text-slate-500">ocupação</span>
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        <AnimatePresence>
          {filtered.map((table, i) => {
            const config = statusConfig[table.status]
            return (
              <motion.div
                key={table.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleTableClick(table)}
                className={cn(
                  'relative cursor-pointer rounded-2xl border-2 p-4 transition-shadow hover:shadow-md',
                  config.bg,
                  table.status === 'INACTIVE' && 'opacity-50 cursor-not-allowed',
                )}
              >
                {/* Status dot */}
                <div className={cn('absolute right-3 top-3 h-2.5 w-2.5 rounded-full', config.dot)}>
                  {table.status === 'OCCUPIED' && (
                    <div className={cn('absolute inset-0 rounded-full animate-pulse-ring', config.dot, 'opacity-50')} />
                  )}
                </div>

                {/* Icon */}
                <div className="mb-3 flex items-center justify-center">
                  <config.icon className={cn('h-8 w-8', config.iconColor)} />
                </div>

                {/* Number */}
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{table.number}</p>
                  {table.name && <p className="text-xs text-slate-500 truncate">{table.name}</p>}
                </div>

                {/* Capacity + status */}
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-0.5 text-xs text-slate-500">
                    <Users className="h-3 w-3" /> {table.capacity}
                  </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', config.badge)}>
                    {config.label}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Add table card */}
        {showNewTable ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/50 p-4 dark:bg-orange-900/10"
          >
            <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">Número da mesa</p>
            <input
              autoFocus
              type="number"
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTableNumber) createTable.mutate(Number(newTableNumber))
                if (e.key === 'Escape') setShowNewTable(false)
              }}
              className="mb-2 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-center text-xl font-bold outline-none focus:border-orange-400 dark:bg-slate-900 dark:border-orange-800"
              placeholder="00"
            />
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-xs"
                disabled={!newTableNumber || createTable.isPending}
                onClick={() => createTable.mutate(Number(newTableNumber))}
              >
                {createTable.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Criar'}
              </Button>
              <Button size="sm" variant="ghost" className="flex-1 text-xs" onClick={() => setShowNewTable(false)}>
                Cancelar
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowNewTable(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-4 text-slate-400 transition-colors hover:border-orange-300 hover:text-orange-500 dark:border-slate-700 dark:bg-slate-900"
          >
            <Plus className="h-7 w-7" />
            <span className="text-xs font-medium">Nova Mesa</span>
          </motion.button>
        )}
      </div>
    </div>
  )
}
