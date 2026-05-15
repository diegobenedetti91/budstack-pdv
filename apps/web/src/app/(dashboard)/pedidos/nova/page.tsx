'use client'

import { useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Minus, Trash2, Send, ArrowLeft,
  ChefHat, Loader2, ShoppingCart, StickyNote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, cn } from '@/lib/utils'

interface Category { id: string; name: string; icon?: string }
interface Product { id: string; name: string; price: number; description?: string; imageUrl?: string; categoryId: string; isAvailable: boolean }
interface CartItem { product: Product; quantity: number; notes: string }

function NovoPedidoContent() {
  const router = useRouter()
  const params = useSearchParams()
  const tableId = params.get('mesa')
  const tableNumber = params.get('numero')
  const { toast } = useToast()

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [editingNote, setEditingNote] = useState<string | null>(null)

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  })

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  })

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.isAvailable)
    if (selectedCategory) list = list.filter((p) => p.categoryId === selectedCategory)
    if (search) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [products, selectedCategory, search])

  const total = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0)
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0)

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1, notes: '' }]
    })
  }

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev
      .map((i) => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
      .filter((i) => i.quantity > 0))
  }

  const updateNote = (productId: string, notes: string) => {
    setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, notes } : i))
  }

  const sendOrder = useMutation({
    mutationFn: async () => {
      const order = await api.post('/orders', { tableId, type: 'TABLE' })
      for (const item of cart) {
        await api.post(`/orders/${order.data.id}/items`, {
          productId: item.product.id,
          quantity: item.quantity,
          notes: item.notes || undefined,
        })
      }
      return order.data
    },
    onSuccess: (order) => {
      toast({ title: `Pedido #${order.orderNumber} enviado para a cozinha!` })
      router.push(`/pedidos?mesa=${tableId}`)
    },
    onError: () => toast({ title: 'Erro ao enviar pedido', variant: 'destructive' }),
  })

  const cartItem = (id: string) => cart.find((i) => i.product.id === id)

  return (
    <div className="flex h-[calc(100vh-112px)] gap-4 overflow-hidden">
      {/* LEFT: Cardápio */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-3">
            <button onClick={() => router.back()} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Novo Pedido</h2>
              <p className="text-xs text-slate-500">Mesa {tableNumber}</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto..." className="pl-9" />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 p-3 dark:border-slate-800">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn('shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors', !selectedCategory ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={cn('flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors', cat.id === selectedCategory ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')}
            >
              {cat.icon && <span>{cat.icon}</span>} {cat.name}
            </button>
          ))}
        </div>

        {/* Products */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((product) => {
              const inCart = cartItem(product.id)
              return (
                <motion.div
                  key={product.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  {/* Image or placeholder */}
                  <div className="relative h-28 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/10 dark:to-orange-900/20">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ChefHat className="h-10 w-10 text-orange-200" />
                      </div>
                    )}
                    {inCart && (
                      <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow">
                        {inCart.quantity}
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="text-sm font-semibold text-slate-900 leading-tight dark:text-white">{product.name}</p>
                    {product.description && <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{product.description}</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-bold text-orange-600">{formatCurrency(product.price)}</span>
                      {inCart ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(product.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-500 dark:bg-slate-800">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-sm font-bold">{inCart.quantity}</span>
                          <button onClick={() => addToCart(product)} className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(product)} className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm hover:bg-orange-600 transition-colors">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Search className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm">Nenhum produto encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart */}
      <div className="flex w-80 shrink-0 flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-orange-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Comanda</h3>
            {itemCount > 0 && (
              <span className="ml-auto rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">{itemCount}</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {cart.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-slate-300">
                <ShoppingCart className="mb-3 h-12 w-12" />
                <p className="text-sm text-slate-400">Nenhum item</p>
                <p className="text-xs text-slate-300">Selecione produtos no cardápio</p>
              </motion.div>
            ) : cart.map((item) => (
              <motion.div
                key={item.product.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 leading-tight dark:text-white truncate">{item.product.name}</p>
                    <p className="text-xs text-orange-600 font-semibold">{formatCurrency(item.product.price * item.quantity)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => updateQty(item.product.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-500 dark:bg-slate-800">
                      {item.quantity === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    </button>
                    <span className="w-5 text-center text-sm font-bold text-slate-900 dark:text-white">{item.quantity}</span>
                    <button onClick={() => addToCart(item.product)} className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Nota */}
                {editingNote === item.product.id ? (
                  <input
                    autoFocus
                    value={item.notes}
                    onChange={(e) => updateNote(item.product.id, e.target.value)}
                    onBlur={() => setEditingNote(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingNote(null)}
                    placeholder="Observação (ex: sem cebola)"
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:border-orange-300 dark:bg-slate-800 dark:border-slate-700"
                  />
                ) : (
                  <button
                    onClick={() => setEditingNote(item.product.id)}
                    className="mt-1 flex items-center gap-1 text-xs text-slate-400 hover:text-orange-500"
                  >
                    <StickyNote className="h-3 w-3" />
                    {item.notes ? <span className="truncate text-slate-500">{item.notes}</span> : 'Adicionar observação'}
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Total + Send */}
        {cart.length > 0 && (
          <div className="border-t border-slate-100 p-4 dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(total)}</span>
            </div>
            <Button
              onClick={() => sendOrder.mutate()}
              disabled={sendOrder.isPending}
              size="lg"
              className="w-full gap-2 bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/25"
            >
              {sendOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar para Cozinha
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function NovoPedidoPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>}>
      <NovoPedidoContent />
    </Suspense>
  )
}
