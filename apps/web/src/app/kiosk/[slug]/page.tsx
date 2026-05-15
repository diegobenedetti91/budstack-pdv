'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart, Plus, Minus, Trash2, ChevronRight,
  CheckCircle2, ChefHat, Loader2, X, StickyNote,
  CreditCard, Banknote, QrCode, ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, cn } from '@/lib/utils'
import { useKitchenSocket } from '@/hooks/use-kitchen-socket'
import { WsEvent, PaymentMethod } from '@budstack/types'
import axios from 'axios'

const kioskApi = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1' })

interface CartItem {
  productId: string
  name: string
  price: number
  imageUrl?: string
  quantity: number
  notes: string
}

type Step = 'menu' | 'cart' | 'payment' | 'tracking'

const paymentMethods = [
  { key: PaymentMethod.CREDIT_CARD, label: 'Cartão de Crédito', icon: CreditCard, desc: 'Aproxime ou insira seu cartão' },
  { key: PaymentMethod.DEBIT_CARD, label: 'Cartão de Débito', icon: CreditCard, desc: 'Aproxime ou insira seu cartão' },
  { key: PaymentMethod.PIX, label: 'PIX', icon: QrCode, desc: 'Pague com QR Code' },
  { key: PaymentMethod.CASH, label: 'Dinheiro', icon: Banknote, desc: 'Pague no caixa' },
]

export default function KioskPage() {
  const { slug } = useParams<{ slug: string }>()
  const qc = useQueryClient()
  const [step, setStep] = useState<Step>('menu')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState<string | null>(null)

  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ['kiosk-menu', slug],
    queryFn: () => kioskApi.get(`/kiosk/${slug}/menu`).then((r) => r.data),
  })

  const tenant = menuData?.tenant
  const categories = menuData?.categories ?? []

  const { data: trackingOrder } = useQuery({
    queryKey: ['kiosk-order', orderId],
    queryFn: () => kioskApi.get(`/kiosk/${slug}/orders/${orderId}`).then((r) => r.data),
    enabled: !!orderId && step === 'tracking',
    refetchInterval: 8000,
  })

  useKitchenSocket({
    [WsEvent.ORDER_ITEM_STATUS]: (payload) => {
      if (payload.orderId === orderId) {
        qc.invalidateQueries({ queryKey: ['kiosk-order', orderId] })
      }
    },
  })

  const allProducts = useMemo(
    () => categories.flatMap((c: any) => c.products ?? []),
    [categories],
  )

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return allProducts
    const cat = categories.find((c: any) => c.id === selectedCategory)
    return cat?.products ?? []
  }, [allProducts, categories, selectedCategory])

  const total = cart.reduce((acc, i) => acc + i.price * i.quantity, 0)
  const itemCount = cart.reduce((acc, i) => acc + i.quantity, 0)

  const addToCart = (product: any) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.productId === product.id)
      if (ex) return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { productId: product.id, name: product.name, price: Number(product.price), imageUrl: product.imageUrl, quantity: 1, notes: '' }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.productId === id ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0))
  }

  const placeOrder = useMutation({
    mutationFn: async () => {
      const { data: order } = await kioskApi.post(`/kiosk/${slug}/orders`, {})
      for (const item of cart) {
        await kioskApi.post(`/kiosk/${slug}/orders/${order.id}/items`, {
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes || undefined,
        })
      }
      if (selectedPayment && selectedPayment !== PaymentMethod.CASH) {
        await kioskApi.post(`/kiosk/${slug}/orders/${order.id}/payments`, {
          method: selectedPayment,
          amount: total,
        })
      }
      return order
    },
    onSuccess: (order) => {
      setOrderId(order.id)
      setStep('tracking')
    },
  })

  const brandColor = tenant?.company?.primaryColor ?? '#F97316'

  if (menuLoading || !tenant) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-white select-none">
      {/* Top bar */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-6">
        <div className="flex items-center gap-3">
          {tenant.company?.logoUrl ? (
            <img src={tenant.company.logoUrl} alt={tenant.name} className="h-9 w-9 rounded-xl object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: brandColor }}>
              <ChefHat className="h-5 w-5 text-white" />
            </div>
          )}
          <span className="font-bold text-lg">{tenant.company?.tradeName ?? tenant.name}</span>
        </div>
        {step !== 'tracking' && itemCount > 0 && (
          <button
            onClick={() => setStep('cart')}
            className="relative flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15 transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            {itemCount} {itemCount === 1 ? 'item' : 'itens'} · {formatCurrency(total)}
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold">
              {itemCount}
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence mode="wait">

          {/* ── MENU ─────────────────────────────────── */}
          {step === 'menu' && (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 overflow-hidden">
              <div className="flex w-52 shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-white/5 p-3">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn('rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors', !selectedCategory ? 'text-white' : 'text-white/50 hover:text-white/80')}
                  style={!selectedCategory ? { backgroundColor: brandColor } : {}}
                >
                  Todos os itens
                </button>
                {categories.map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn('flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors', cat.id === selectedCategory ? 'text-white' : 'text-white/50 hover:text-white/80')}
                    style={cat.id === selectedCategory ? { backgroundColor: brandColor } : {}}
                  >
                    {cat.icon && <span>{cat.icon}</span>}
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredProducts.map((product: any) => {
                    const inCart = cart.find((i) => i.productId === product.id)
                    return (
                      <motion.div
                        key={product.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur transition-all hover:border-white/20 hover:bg-white/10"
                      >
                        <div className="relative h-40 overflow-hidden bg-white/5">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ChefHat className="h-12 w-12 text-white/10" />
                            </div>
                          )}
                          {inCart && (
                            <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow" style={{ backgroundColor: brandColor }}>
                              {inCart.quantity}
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="font-semibold leading-tight text-white">{product.name}</p>
                          {product.description && <p className="mt-0.5 text-xs text-white/40 line-clamp-2">{product.description}</p>}
                          <div className="mt-3 flex items-center justify-between">
                            <span className="font-bold" style={{ color: brandColor }}>{formatCurrency(product.price)}</span>
                            {inCart ? (
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => updateQty(product.id, -1)} className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/10 hover:bg-red-500/20 hover:text-red-400 transition-colors">
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-5 text-center font-bold">{inCart.quantity}</span>
                                <button onClick={() => addToCart(product)} className="flex h-7 w-7 items-center justify-center rounded-xl text-white transition-colors" style={{ backgroundColor: brandColor }}>
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => addToCart(product)} className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow transition-colors" style={{ backgroundColor: brandColor }}>
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── CART ─────────────────────────────────── */}
          {step === 'cart' && (
            <motion.div key="cart" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="flex flex-1 flex-col overflow-hidden">
              <div className="border-b border-white/5 p-5">
                <div className="flex items-center gap-3">
                  <button onClick={() => setStep('menu')} className="rounded-xl p-2 text-white/50 hover:bg-white/10">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-xl font-bold">Seu Pedido</h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {cart.map((item) => (
                  <div key={item.productId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                        {item.imageUrl ? <img src={item.imageUrl} className="h-full w-full rounded-xl object-cover" alt="" /> : <ChefHat className="h-5 w-5 text-white/30" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm font-bold" style={{ color: brandColor }}>{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.productId, -1)} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-red-500/20">
                          {item.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                        </button>
                        <span className="w-6 text-center font-bold">{item.quantity}</span>
                        <button onClick={() => addToCart({ id: item.productId, name: item.name, price: item.price, imageUrl: item.imageUrl })} className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ backgroundColor: brandColor }}>
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {editingNote === item.productId ? (
                      <input
                        autoFocus
                        value={item.notes}
                        onChange={(e) => setCart((prev) => prev.map((i) => i.productId === item.productId ? { ...i, notes: e.target.value } : i))}
                        onBlur={() => setEditingNote(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingNote(null)}
                        placeholder="Ex: sem cebola, bem passado..."
                        className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
                      />
                    ) : (
                      <button onClick={() => setEditingNote(item.productId)} className="mt-2 flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors">
                        <StickyNote className="h-3 w-3" />
                        {item.notes || 'Adicionar observação'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-white/5 p-5">
                <div className="mb-4 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span style={{ color: brandColor }}>{formatCurrency(total)}</span>
                </div>
                <Button size="lg" className="w-full gap-2 text-white" style={{ backgroundColor: brandColor }} onClick={() => setStep('payment')}>
                  Escolher Pagamento <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── PAYMENT ──────────────────────────────── */}
          {step === 'payment' && (
            <motion.div key="payment" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="flex flex-1 flex-col items-center justify-center p-8">
              <h2 className="mb-2 text-2xl font-bold">Como você quer pagar?</h2>
              <p className="mb-8 text-white/50">Total: <span className="font-bold text-white">{formatCurrency(total)}</span></p>
              <div className="grid w-full max-w-lg grid-cols-2 gap-4">
                {paymentMethods.map((m) => (
                  <motion.button
                    key={m.key}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedPayment(m.key)}
                    className={cn(
                      'flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-all',
                      selectedPayment === m.key ? 'border-transparent text-white shadow-lg' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
                    )}
                    style={selectedPayment === m.key ? { backgroundColor: brandColor, borderColor: brandColor } : {}}
                  >
                    <m.icon className="h-8 w-8" />
                    <div>
                      <p className="font-bold">{m.label}</p>
                      <p className="text-xs opacity-70">{m.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
              <div className="mt-8 flex w-full max-w-lg gap-3">
                <Button variant="outline" size="lg" className="flex-1 border-white/10 text-white hover:bg-white/10" onClick={() => setStep('cart')}>
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button
                  size="lg"
                  className="flex-1 gap-2 text-white"
                  style={{ backgroundColor: brandColor }}
                  disabled={!selectedPayment || placeOrder.isPending}
                  onClick={() => placeOrder.mutate()}
                >
                  {placeOrder.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  Confirmar Pedido
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── TRACKING ─────────────────────────────── */}
          {step === 'tracking' && (
            <motion.div key="tracking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="mb-6 flex h-24 w-24 items-center justify-center rounded-full shadow-2xl"
                style={{ backgroundColor: brandColor, boxShadow: `0 0 40px ${brandColor}40` }}
              >
                <ChefHat className="h-12 w-12 text-white" />
              </motion.div>
              <h2 className="mb-1 text-3xl font-bold">Pedido #{trackingOrder?.orderNumber}</h2>
              <p className="mb-8 text-white/50">Acompanhe o status do seu pedido</p>
              <div className="w-full max-w-md space-y-3">
                {trackingOrder?.items?.map((item: any, i: number) => {
                  const statusLabels: Record<string, { label: string; color: string }> = {
                    PENDING: { label: 'Aguardando', color: 'text-yellow-400' },
                    IN_PRODUCTION: { label: '🔥 Produzindo', color: 'text-blue-400' },
                    READY: { label: '✅ Pronto!', color: 'text-green-400' },
                    DELIVERED: { label: 'Entregue', color: 'text-slate-400' },
                  }
                  const s = statusLabels[item.status] ?? statusLabels.PENDING
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
                          {item.quantity}×
                        </span>
                        <span className="font-medium">{item.product?.name}</span>
                      </div>
                      <span className={cn('text-sm font-semibold', s.color)}>{s.label}</span>
                    </motion.div>
                  )
                })}
              </div>
              {trackingOrder?.items?.every((i: any) => i.status === 'READY' || i.status === 'DELIVERED') && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
                  <div className="mb-3 flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="h-6 w-6" />
                    <span className="text-xl font-bold">Seu pedido está pronto!</span>
                  </div>
                  <p className="text-white/50">Dirija-se ao balcão para retirar</p>
                </motion.div>
              )}
              <button
                onClick={() => { setStep('menu'); setCart([]); setOrderId(null); setSelectedPayment(null) }}
                className="mt-10 text-sm text-white/30 hover:text-white/50 transition-colors"
              >
                Fazer novo pedido
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
