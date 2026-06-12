'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle, Package, TrendingDown, RefreshCw, Check, X,
  ChevronDown, Eye, EyeOff, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, cn } from '@/lib/utils'
import axios from 'axios'

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1' })

interface StockProduct {
  id: string
  name: string
  category: { name: string }
  price: number
  costPrice: number | null
  stockQuantity: number
  stockMinimum: number
  stockControl: boolean
  isAvailable: boolean
  imageUrl?: string
}

export default function EstoquePage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'low' | 'ok'>('all')

  const { data: products, isLoading, refetch } = useQuery<StockProduct[]>({
    queryKey: ['stock-products'],
    queryFn: async () => {
      const { data } = await api.get('/stock')
      return data
    },
    refetchInterval: 30000,
  })

  const grouped = (products ?? []).reduce(
    (acc, prod) => {
      const cat = prod.category.name
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(prod)
      return acc
    },
    {} as Record<string, StockProduct[]>,
  )

  const getStockStatus = (product: StockProduct) => {
    if (product.stockQuantity === 0) return 'out'
    if (product.stockQuantity <= product.stockMinimum) return 'critical'
    if (product.stockQuantity <= product.stockMinimum * 1.5) return 'low'
    return 'ok'
  }

  const filterProducts = (prods: StockProduct[]) => {
    return prods.filter((p) => {
      if (!filterStatus || filterStatus === 'all') return true
      return getStockStatus(p) === filterStatus
    })
  }

  const stats = {
    outOfStock: (products ?? []).filter((p) => p.stockQuantity === 0).length,
    belowMinimum: (products ?? []).filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.stockMinimum)
      .length,
    totalProducts: products?.length ?? 0,
  }

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
          <h1 className="text-3xl font-bold">Controle de Estoque</h1>
          <p className="text-sm text-slate-400">
            {products?.length ?? 0} produtos | {stats.outOfStock} sem estoque | {stats.belowMinimum} abaixo
            do mínimo
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'Todos', color: 'text-slate-400' },
          { value: 'critical', label: 'Crítico', color: 'text-red-500' },
          { value: 'low', label: 'Baixo', color: 'text-yellow-500' },
          { value: 'ok', label: 'OK', color: 'text-emerald-500' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value as any)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition',
              filterStatus === f.value
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Alertas */}
      {stats.outOfStock > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div className="flex-1">
              <p className="font-semibold text-red-400">{stats.outOfStock} produtos sem estoque</p>
              <p className="text-sm text-red-300">Esses itens não aparecem no cardápio do kiosk</p>
            </div>
            <Zap className="h-5 w-5 text-red-500 opacity-50" />
          </div>
        </div>
      )}

      {stats.belowMinimum > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <div className="flex items-center gap-3">
            <TrendingDown className="h-5 w-5 text-yellow-500" />
            <div className="flex-1">
              <p className="font-semibold text-yellow-400">{stats.belowMinimum} produtos abaixo do mínimo</p>
              <p className="text-sm text-yellow-300">Considere repor o estoque em breve</p>
            </div>
          </div>
        </div>
      )}

      {/* Produtos por categoria */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, products]) => {
          const filtered = filterProducts(products)
          if (filtered.length === 0) return null

          return (
            <div key={category} className="rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden">
              <button
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-cyan-400" />
                  <h2 className="font-semibold">{category}</h2>
                  <span className="text-sm text-slate-400">({filtered.length})</span>
                </div>
                <ChevronDown
                  className={cn('h-5 w-5 transition', expandedCategory === category && 'rotate-180')}
                />
              </button>

              {expandedCategory === category && (
                <div className="border-t border-slate-700 divide-y divide-slate-700">
                  {filtered.map((product) => {
                    const status = getStockStatus(product)
                    const isLow = status === 'critical' || status === 'low'
                    const profit =
                      product.costPrice && status !== 'out'
                        ? product.price - product.costPrice
                        : null

                    return (
                      <div key={product.id} className="p-4 hover:bg-slate-700/30 transition">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium truncate">{product.name}</h3>
                              {status === 'out' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                                  <X className="h-3 w-3" />
                                  Sem estoque
                                </span>
                              )}
                              {status === 'critical' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                                  <AlertTriangle className="h-3 w-3" />
                                  Crítico
                                </span>
                              )}
                              {status === 'low' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                                  <TrendingDown className="h-3 w-3" />
                                  Baixo
                                </span>
                              )}
                              {status === 'ok' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                                  <Check className="h-3 w-3" />
                                  OK
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                              <div>
                                <p className="text-slate-400">Quantidade</p>
                                <p className={cn('font-semibold', isLow ? 'text-red-400' : 'text-cyan-400')}>
                                  {product.stockQuantity} un
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-400">Mínimo</p>
                                <p className="font-semibold text-slate-300">{product.stockMinimum} un</p>
                              </div>
                              <div>
                                <p className="text-slate-400">Preço</p>
                                <p className="font-semibold text-slate-300">{formatCurrency(Number(product.price))}</p>
                              </div>
                              <div>
                                <p className="text-slate-400">Custo</p>
                                <p className="font-semibold text-slate-300">
                                  {product.costPrice ? formatCurrency(Number(product.costPrice)) : '—'}
                                </p>
                              </div>
                            </div>

                            {profit !== null && (
                              <div className="mt-2 text-sm">
                                <p className="text-slate-400">
                                  Margem:{' '}
                                  <span className="text-emerald-400 font-semibold">
                                    {formatCurrency(profit)} por unidade
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {product.isAvailable ? (
                              <Eye className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-slate-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
