'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart, Plus, Minus, Trash2, ChevronRight, CheckCircle2,
  ChefHat, Loader2, StickyNote, CreditCard, Banknote, QrCode,
  ArrowLeft, Users, TableProperties, Utensils, Split, ReceiptText, BellRing,
  Sparkles, Star, Clock, Repeat2, Tag, X, AlertCircle, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, cn } from '@/lib/utils'
import { useKitchenSocket } from '@/hooks/use-kitchen-socket'
import { WsEvent, PaymentMethod } from '@budstack/types'
import axios from 'axios'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  costPrice?: number
  imageUrl?: string
  stockQuantity?: number
}
const kioskApi = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1' })

interface CartItem {
  productId: string
  name: string
  price: number
  imageUrl?: string
  quantity: number
  notes: string
}

interface KioskTable {
  id: string
  number: number
  name: string | null
  capacity: number | null
  status: string
}

type Step = 'table' | 'menu' | 'cart' | 'identity' | 'payment' | 'tracking' | 'bill-requested' | 'confirmed'
type PaymentMode = 'full' | 'split'
type OrderType = 'table' | 'takeaway'

const paymentMethods = [
  { key: PaymentMethod.CREDIT_CARD, label: 'Crédito', icon: CreditCard },
  { key: PaymentMethod.DEBIT_CARD, label: 'Débito', icon: CreditCard },
  { key: PaymentMethod.PIX, label: 'PIX', icon: QrCode },
  { key: PaymentMethod.CASH, label: 'Dinheiro', icon: Banknote },
]

const itemStatusMap: Record<string, { label: string; color: string; dot: string }> = {
  PENDING:       { label: 'Aguardando', color: 'text-yellow-400',   dot: 'bg-yellow-400'              },
  IN_PRODUCTION: { label: 'Produzindo', color: 'text-cyan-400',     dot: 'bg-cyan-400 animate-pulse'  },
  READY:         { label: 'Pronto!',    color: 'text-emerald-400',  dot: 'bg-emerald-400'             },
  DELIVERED:     { label: 'Entregue',   color: 'text-slate-500',    dot: 'bg-slate-500'               },
}

/* ── Brand gradient constants ─────────────────────────────────────────────── */
const BRAND_GRADIENT  = 'linear-gradient(135deg, #22D3EE 0%, #3B82F6 50%, #8B5CF6 100%)'
const BRAND_GLOW      = '0 8px 32px rgba(6,182,212,0.35)'
const BRAND_GLOW_LG   = '0 0 80px rgba(6,182,212,0.40)'
const BRAND_TEXT      = '#22D3EE'

export default function KioskPage() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const qc = useQueryClient()

  const [step, setStep] = useState<Step>('table')
  const [selectedTable, setSelectedTable] = useState<KioskTable | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [tableFromQR, setTableFromQR] = useState(false)
  const [localCart, setLocalCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('full')
  const [splitPeople, setSplitPeople] = useState(2)
  const [splitPaidCount, setSplitPaidCount] = useState(0)
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderType, setOrderType] = useState<OrderType>('table')
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [lastOrder, setLastOrder] = useState<any>(null)
  const [estimatedTime, setEstimatedTime] = useState(15)
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [discountAmount, setDiscountAmount] = useState(0)

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ['kiosk-menu', slug],
    queryFn: () => kioskApi.get(`/kiosk/${slug}/menu`).then((r) => r.data),
  })

  const { data: tables = [] } = useQuery<KioskTable[]>({
    queryKey: ['kiosk-tables', slug],
    queryFn: () => kioskApi.get(`/kiosk/${slug}/tables`).then((r) => r.data),
  })

  const { data: tableCurrentOrder } = useQuery({
    queryKey: ['kiosk-table-order', selectedTable?.id],
    queryFn: () =>
      kioskApi.get(`/kiosk/${slug}/tables/${selectedTable!.id}/order`).then((r) => r.data).catch(() => null),
    enabled: !!selectedTable && selectedTable.status === 'OCCUPIED',
  })

  useEffect(() => {
    const saved = localStorage.getItem('lastKioskOrder')
    if (saved) {
      try {
        setLastOrder(JSON.parse(saved))
      } catch (e) {}
    }
  }, [])

  useEffect(() => {
    if (tableCurrentOrder?.id && !orderId) setOrderId(tableCurrentOrder.id)
  }, [tableCurrentOrder, orderId])

  useEffect(() => {
    const tableParam = searchParams.get('table')
    if (tableParam && tables.length > 0) {
      const tableNumber = parseInt(tableParam, 10)
      const foundTable = tables.find(t => t.number === tableNumber)
      if (foundTable) {
        setSelectedTable(foundTable)
        setStep('menu')
        setTableFromQR(true)
      }
    }
  }, [searchParams, tables])

  const { data: apiOrder, refetch: refetchOrder } = useQuery({
    queryKey: ['kiosk-order', orderId],
    queryFn: () => kioskApi.get(`/kiosk/${slug}/orders/${orderId}`).then((r) => r.data),
    enabled: !!orderId,
    refetchInterval: step === 'tracking' ? 3000 : false,
  })

  useKitchenSocket({
    [WsEvent.ORDER_ITEM_STATUS]: (payload) => {
      if (payload.orderId === orderId) refetchOrder()
    },
  })

  const tenant = menuData?.tenant
  const categories = menuData?.categories ?? []

  const allProducts = useMemo(() => categories.flatMap((c: any) => c.products ?? []), [categories])

  // Aplicar cupom
  const applyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError('')
    try {
      const { data } = await kioskApi.post('/coupons/validate', {
        code: couponCode,
        orderTotal: remaining,
      })
      setAppliedCoupon(data.coupon)
      setDiscountAmount(data.discount)
      setCouponCode('')
    } catch (error: any) {
      setCouponError(error.response?.data?.message || 'Cupom inválido')
    } finally {
      setCouponLoading(false)
    }
  }

  // Calcular tempo estimado
  useEffect(() => {
    const itemCount = apiOrder?.items?.length || 0
    const avgTimePerItem = 5
    const baseTime = 10
    setEstimatedTime(baseTime + itemCount * avgTimePerItem)
  }, [apiOrder?.items])

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return allProducts
    return categories.find((c: any) => c.id === selectedCategory)?.products ?? []
  }, [allProducts, categories, selectedCategory])

  // ── Computed values ────────────────────────────────────────────────────────
  const orderTotal  = Number(apiOrder?.total ?? 0)
  const alreadyPaid = (apiOrder?.payments ?? [])
    .filter((p: any) => p.status === 'APPROVED')
    .reduce((acc: number, p: any) => acc + Number(p.amount), 0)
  const remaining      = orderTotal - alreadyPaid
  const localItemCount = localCart.reduce((acc, i) => acc + i.quantity, 0)
  const localTotal     = localCart.reduce((acc, i) => acc + i.price * i.quantity, 0)
  const splitAmount    = splitPeople > 0 ? remaining / splitPeople : remaining
  const isFullyPaid    = orderId && remaining <= 0.01

  // ── Brand helpers (respects tenant custom color OR falls back to brand gradient) ──
  const tenantColor = tenant?.company?.primaryColor
  const brandBg     = tenantColor
    ? { backgroundColor: tenantColor }
    : { background: BRAND_GRADIENT }
  const brandGlow   = tenantColor ? `0 8px 32px ${tenantColor}40`  : BRAND_GLOW
  const brandGlowLg = tenantColor ? `0 0 80px ${tenantColor}45`    : BRAND_GLOW_LG
  const brandText   = tenantColor ?? BRAND_TEXT

  // ── Actions ────────────────────────────────────────────────────────────────
  const sendToKitchen = useMutation({
    mutationFn: async () => {
      let id = orderId
      if (!id) {
        const { data: order } = await kioskApi.post(`/kiosk/${slug}/orders`, {
          tableId:       orderType === 'table' ? selectedTable?.id ?? null : null,
          type:          orderType,
          customerName:  customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
        })
        id = order.id
        setOrderId(order.id)
        qc.invalidateQueries({ queryKey: ['kiosk-tables', slug] })
      }
      for (const item of localCart) {
        await kioskApi.post(`/kiosk/${slug}/orders/${id}/items`, {
          productId: item.productId,
          quantity:  item.quantity,
          notes:     item.notes || undefined,
        })
      }
      setLocalCart([])
      return id
    },
    onSuccess: () => {
      refetchOrder()
      if (!selectedTable) setStep('confirmed')
      else setStep('cart')
    },
  })

  const makePayment = useMutation({
    mutationFn: async () => {
      if (!orderId || !selectedPayment) return null
      const amount = paymentMode === 'split' ? splitAmount : remaining
      const { data } = await kioskApi.post(`/kiosk/${slug}/orders/${orderId}/payments`, {
        method: selectedPayment,
        amount,
      })
      return data
    },
    onSuccess: () => {
      setSelectedPayment(null)
      if (paymentMode === 'split') setSplitPaidCount((n) => n + 1)
      refetchOrder()
    },
  })

  const requestBill = useMutation({
    mutationFn: async () => {
      if (!orderId) return null
      await kioskApi.post(`/kiosk/${slug}/orders/${orderId}/request-bill`)
    },
    onSuccess: () => setStep('bill-requested'),
  })

  const addToCart = (product: any) => {
    setLocalCart((prev) => {
      const ex = prev.find((i) => i.productId === product.id)
      if (ex) return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { productId: product.id, name: product.name, price: Number(product.price), imageUrl: product.imageUrl, quantity: 1, notes: '' }]
    })
  }

  const updateLocalQty = (id: string, delta: number) => {
    setLocalCart((prev) => prev.map((i) => i.productId === id ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0))
  }

  const resetAll = () => {
    setStep('table')
    setSelectedTable(null)
    setOrderId(null)
    setLocalCart([])
    setSelectedCategory(null)
    setSelectedPayment(null)
    setPaymentMode('full')
    setSplitPeople(2)
    setSplitPaidCount(0)
    setCustomerName('')
    setCustomerPhone('')
    setOrderType('table')
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (menuLoading || !tenant) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090e]">
        <div className="flex flex-col items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-2xl"
            style={{ background: BRAND_GRADIENT, boxShadow: BRAND_GLOW_LG }}
          >
            <ChefHat className="h-8 w-8 text-white" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-white/20" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#09090e] text-white select-none">

      {/* ── Ambient gradient overlay ─────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 250px at 50% 0, rgba(6,182,212,0.04) 0%, transparent 55%), ' +
            'radial-gradient(ellipse 40% 200px at 95% 100%, rgba(139,92,246,0.04) 0%, transparent 50%)',
        }}
      />

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] px-5">
        <div className="flex items-center gap-3">
          {tenant.company?.logoUrl ? (
            <img src={tenant.company.logoUrl} alt={tenant.name} className="h-9 w-9 rounded-xl object-cover ring-1 ring-white/10" />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl shadow-lg"
              style={{ ...brandBg, boxShadow: brandGlow }}
            >
              <ChefHat className="h-5 w-5 text-white" />
            </div>
          )}
          <span className="font-semibold text-base tracking-tight">
            {tenant.company?.tradeName ?? tenant.name}
          </span>

          {selectedTable && !orderId && !tableFromQR && (
            <button
              onClick={() => { setStep('table'); setOrderId(null); setLocalCart([]) }}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.07] px-2.5 py-1 text-xs text-white/50 transition-colors hover:bg-white/[0.12]"
            >
              Mesa {selectedTable.number} ×
            </button>
          )}
          {selectedTable && orderId && (
            <span className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.07] px-2.5 py-1 text-xs text-white/50">
              Mesa {selectedTable.number}
            </span>
          )}
        </div>

        {step === 'menu' && orderId && (
          <button
            onClick={() => setStep('cart')}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.10]"
          >
            <ReceiptText className="h-4 w-4" />
            Ver pedido
          </button>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        <AnimatePresence mode="wait">

          {/* ══ TABLE SELECTION ══════════════════════════════════════════════ */}
          {step === 'table' && (
            <motion.div key="table"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col items-center overflow-y-auto p-6 pt-10"
            >
              <div className="w-full max-w-xl">
                {/* Hero */}
                <div className="mb-10 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.05 }}
                    className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl shadow-2xl"
                    style={{ ...brandBg, boxShadow: brandGlowLg }}
                  >
                    <TableProperties className="h-10 w-10 text-white" />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="text-3xl font-bold tracking-tight"
                  >
                    Qual é a sua mesa?
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                    className="mt-2 text-base text-white/40"
                  >
                    Selecione ou peça para viagem
                  </motion.p>
                </div>

                {tables.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-6"
                  >
                    {tables.map((table, i) => {
                      const isOccupied = table.status === 'OCCUPIED'
                      const isSelected = selectedTable?.id === table.id
                      return (
                        <motion.button
                          key={table.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 + i * 0.02 }}
                          whileHover={{ scale: 1.06, transition: { duration: 0.15 } }}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => setSelectedTable(table)}
                          className={cn(
                            'relative flex flex-col items-center justify-center rounded-2xl border py-4 px-2 transition-all',
                            isSelected
                              ? 'border-transparent text-white shadow-xl'
                              : isOccupied
                              ? 'border-amber-500/30 bg-amber-500/[0.08] text-amber-300 hover:bg-amber-500/[0.14]'
                              : 'border-white/[0.07] bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white',
                          )}
                          style={isSelected ? { ...brandBg, boxShadow: brandGlow } : {}}
                        >
                          <span className="text-2xl font-black">{table.number}</span>
                          {table.name && (
                            <span className="mt-0.5 w-full truncate text-center text-[9px] leading-tight opacity-60">
                              {table.name}
                            </span>
                          )}
                          {isOccupied && !isSelected && (
                            <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-wide text-amber-400">
                              Em uso
                            </span>
                          )}
                          {table.capacity && !isOccupied && !isSelected && (
                            <span className="mt-1.5 text-[9px] opacity-30">{table.capacity} lug.</span>
                          )}
                          {isSelected && (
                            <motion.span
                              initial={{ scale: 0 }} animate={{ scale: 1 }}
                              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" style={{ color: brandText }} />
                            </motion.span>
                          )}
                        </motion.button>
                      )
                    })}
                  </motion.div>
                ) : (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 text-center text-white/30">
                    <TableProperties className="mx-auto mb-3 h-9 w-9" />
                    <p className="text-sm">Nenhuma mesa cadastrada</p>
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="mt-8 flex gap-3"
                >
                  <Button size="lg"
                    className="flex-1 gap-2 border border-white/[0.10] bg-white/[0.06] font-medium text-white hover:bg-white/[0.11]"
                    onClick={() => { setSelectedTable(null); setStep('menu') }}
                  >
                    <Utensils className="h-4 w-4 opacity-70" />
                    Para viagem
                  </Button>
                  <Button size="lg"
                    className="flex-1 gap-2 font-semibold text-white shadow-xl transition-all"
                    style={{ ...brandBg, boxShadow: selectedTable ? brandGlow : 'none', opacity: selectedTable ? 1 : 0.4 }}
                    disabled={!selectedTable}
                    onClick={() => setStep('menu')}
                  >
                    Continuar <ChevronRight className="h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ══ MENU ═════════════════════════════════════════════════════════ */}
          {step === 'menu' && (
            <motion.div key="menu"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 flex-col overflow-hidden"
            >
              {/* Category tabs */}
              <div className="border-b border-white/[0.06] bg-[#09090e]">
                {!orderId && !tableFromQR && (
                  <div className="flex items-center gap-2 px-4 pb-1 pt-3">
                    <button
                      onClick={() => setStep('table')}
                      className="flex items-center gap-1.5 text-xs text-white/30 transition-colors hover:text-white/60"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Mudar mesa
                    </button>
                  </div>
                )}
                <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all',
                      !selectedCategory
                        ? 'border-transparent text-white shadow-lg'
                        : 'border-white/[0.08] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80',
                    )}
                    style={!selectedCategory ? brandBg : {}}
                  >
                    Todos
                  </button>
                  {categories.map((cat: any) => (
                    <button key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all',
                        cat.id === selectedCategory
                          ? 'border-transparent text-white shadow-lg'
                          : 'border-white/[0.08] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80',
                      )}
                      style={cat.id === selectedCategory ? brandBg : {}}
                    >
                      {cat.icon && <span className="text-sm">{cat.icon}</span>}
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product grid */}

              {/* REPETIR ÚLTIMO PEDIDO */}
              {lastOrder && !orderId && !selectedTable && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-4 mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Repeat2 className="h-5 w-5 text-emerald-400" />
                    <div className="flex-1">
                      <p className="font-semibold text-white">Repetir último pedido?</p>
                      <p className="text-xs text-white/60">
                        {lastOrder.items?.length} itens de {new Date(lastOrder.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setLocalCart(
                          lastOrder.items.map((item: any) => ({
                            productId: item.productId,
                            name: item.product?.name,
                            price: item.unitPrice,
                            imageUrl: item.product?.imageUrl,
                            quantity: item.quantity,
                            notes: '',
                          }))
                        )
                        setLastOrder(null)
                      }}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      Repetir
                    </button>
                  </div>
                </motion.div>
              )}
              <div className="flex-1 overflow-y-auto p-4">
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-white/20">
                    <ChefHat className="mb-3 h-12 w-12" />
                    <p className="text-sm">Nenhum produto nesta categoria</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredProducts.map((product: any) => {
                      const inCart = localCart.find((i) => i.productId === product.id)
                      return (
                        <motion.div key={product.id}
                          whileHover={{ y: -3, transition: { duration: 0.15 } }}
                          whileTap={{ scale: 0.97 }}
                          className="group relative overflow-hidden cursor-pointer" onClick={() => setSelectedProductModal(product)} rounded-2xl border border-white/[0.07] bg-white/[0.04] transition-all hover:border-white/[0.14] hover:bg-white/[0.07]"
                        >
                          {/* Image */}
                          <div className="relative h-36 overflow-hidden bg-white/[0.04]">
                            {product.imageUrl ? (
                              <>
                                <img src={product.imageUrl} alt={product.name}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                              </>
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <ChefHat className="h-10 w-10 text-white/10" />
                              </div>
                            )}
                            {inCart && (
                              <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white shadow-lg ring-2 ring-black/30"
                                style={{ ...brandBg }}
                              >
                                {inCart.quantity}
                              </motion.div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="p-3">
                            <p className="text-sm font-semibold leading-snug text-white">{product.name}</p>
                            {product.description && (
                              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-white/35">
                                {product.description}
                              </p>
                            )}
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-sm font-black" style={{ color: brandText }}>
                                {formatCurrency(product.price)}
                              </span>
                              {inCart ? (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => updateLocalQty(product.id, -1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/[0.08] transition-colors hover:bg-red-500/20 hover:text-red-400">
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="w-5 text-center text-sm font-bold">{inCart.quantity}</span>
                                  <button onClick={() => addToCart(product)}
                                    className="flex h-7 w-7 items-center justify-center rounded-xl text-white shadow-md transition-opacity hover:opacity-85"
                                    style={{ ...brandBg }}>
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => addToCart(product)}
                                  className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-lg transition-all hover:opacity-85"
                                  style={{ ...brandBg }}>
                                  <Plus className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Floating cart bar */}
              <AnimatePresence>
                {localItemCount > 0 && (
                  <motion.div
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className="border-t border-white/[0.06] bg-[#09090e]/80 p-4 backdrop-blur-md"
                  >
                    <button
                      onClick={() => setStep('cart')}
                      className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-white shadow-2xl transition-all active:scale-[0.98] hover:opacity-95"
                      style={{ ...brandBg, boxShadow: brandGlow }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <ShoppingCart className="h-5 w-5" />
                          <span
                            className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-black"
                            style={{ color: brandText }}
                          >
                            {localItemCount}
                          </span>
                        </div>
                        <span className="font-semibold">
                          {localItemCount} {localItemCount === 1 ? 'item' : 'itens'} no carrinho
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black">{formatCurrency(localTotal)}</span>
                        <ChevronRight className="h-5 w-5 opacity-80" />
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ══ CART ═════════════════════════════════════════════════════════ */}
          {step === 'cart' && (
            <motion.div key="cart"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="border-b border-white/[0.06] p-5">
                <div className="flex items-center gap-3">
                  <button onClick={() => setStep('menu')}
                    className="rounded-xl p-2 text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/70">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Seu Pedido</h2>
                    {selectedTable && <p className="text-xs text-white/35">Mesa {selectedTable.number}</p>}
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto p-5">

                {/* Already ordered */}
                {apiOrder?.items?.length > 0 && (
                  <div>
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-white/25">Já pedido</p>
                    <div className="space-y-2">
                      {apiOrder.items.map((item: any) => {
                        const s = itemStatusMap[item.status] ?? itemStatusMap.PENDING
                        return (
                          <div key={item.id}
                            className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.07]">
                              {item.product?.imageUrl
                                ? <img src={item.product.imageUrl} className="h-full w-full object-cover" alt="" />
                                : <ChefHat className="h-4 w-4 text-white/25" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-tight">{item.product?.name}</p>
                              {item.notes && (
                                <p className="mt-0.5 truncate text-xs text-white/25">{item.notes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                              <span className={cn('text-xs font-semibold', s.color)}>{s.label}</span>
                            </div>
                            <span className="shrink-0 rounded-lg bg-white/[0.07] px-2 py-0.5 text-xs font-semibold">
                              {item.quantity}×
                            </span>
                            <span className="shrink-0 text-sm font-bold">
                              {formatCurrency(Number(item.totalPrice))}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-3 space-y-1.5 rounded-2xl border border-white/[0.05] bg-white/[0.04] p-4 text-sm">
                      <div className="flex justify-between text-white/50">
                        <span>Subtotal</span><span>{formatCurrency(orderTotal)}</span>
                      </div>
                      {alreadyPaid > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Pago</span><span>− {formatCurrency(alreadyPaid)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-white/[0.06] pt-2 text-base font-black">
                        <span>Restante</span>
                        <span style={{ color: brandText }}>{formatCurrency(remaining)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Local cart */}
                {localCart.length > 0 && (
                  <div>
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-white/25">
                      {apiOrder ? 'Adicionando agora' : 'Seu carrinho'}
                    </p>
                    <div className="space-y-2">
                      {localCart.map((item) => (
                        <div key={item.productId}
                          className="rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.03] p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.07]">
                              {item.imageUrl
                                ? <img src={item.imageUrl} className="h-full w-full object-cover" alt="" />
                                : <ChefHat className="h-4 w-4 text-white/25" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-tight">{item.name}</p>
                              <p className="mt-0.5 text-xs" style={{ color: brandText }}>
                                {formatCurrency(item.price)} un.
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateLocalQty(item.productId, -1)}
                                className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/[0.07] transition-colors hover:bg-red-500/20 hover:text-red-400">
                                {item.quantity === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                              </button>
                              <span className="w-5 text-center text-sm font-black">{item.quantity}</span>
                              <button
                                onClick={() => addToCart({ id: item.productId, name: item.name, price: item.price, imageUrl: item.imageUrl })}
                                className="flex h-7 w-7 items-center justify-center rounded-xl text-white transition-opacity hover:opacity-80"
                                style={{ ...brandBg }}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <span className="w-16 text-right text-sm font-bold">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>

                          {editingNote === item.productId ? (
                            <input autoFocus
                              value={item.notes}
                              onChange={(e) => setLocalCart((p) => p.map((i) => i.productId === item.productId ? { ...i, notes: e.target.value } : i))}
                              onBlur={() => setEditingNote(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingNote(null)}
                              placeholder="Ex: sem cebola..."
                              className="mt-2.5 w-full rounded-xl border border-white/[0.15] bg-white/[0.08] px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 transition-colors focus:border-white/25"
                            />
                          ) : (
                            <button
                              onClick={() => setEditingNote(item.productId)}
                              className="mt-2 flex items-center gap-1.5 text-xs text-white/25 transition-colors hover:text-white/50"
                            >
                              <StickyNote className="h-3 w-3" />
                              {item.notes || 'Adicionar observação'}
                            </button>
                          )}
                        </div>
                      ))}

                      <div className="flex justify-between px-1 pt-1 text-sm">
                        <span className="text-white/40">
                          {localCart.length} {localCart.length === 1 ? 'item' : 'itens'} novos
                        </span>
                        <span className="font-black" style={{ color: brandText }}>
                          {formatCurrency(localTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!apiOrder?.items?.length && localCart.length === 0 && (
                  <div className="flex flex-1 flex-col items-center justify-center py-20 text-white/15">
                    <ShoppingCart className="mb-4 h-14 w-14" />
                    <p className="text-lg font-medium text-white/25">Carrinho vazio</p>
                    <button
                      onClick={() => setStep('menu')}
                      className="mt-3 text-sm font-semibold transition-opacity hover:opacity-75"
                      style={{ color: brandText }}
                    >
                      Ver cardápio →
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom actions */}
              <div className="space-y-3 border-t border-white/[0.06] p-5">
                {localCart.length > 0 && (
                  <>
                    {!selectedTable && !orderId && (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setOrderType('table')}
                          className={cn(
                            'rounded-2xl border-2 px-4 py-3 text-center font-semibold transition-all',
                            orderType === 'table'
                              ? 'border-transparent text-white shadow-xl'
                              : 'border-white/[0.08] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80',
                          )}
                          style={orderType === 'table' ? { ...brandBg, boxShadow: brandGlow } : {}}
                        >
                          <Utensils className="mx-auto mb-1 h-5 w-5" />
                          Na mesa
                        </button>
                        <button
                          onClick={() => setOrderType('takeaway')}
                          className={cn(
                            'rounded-2xl border-2 px-4 py-3 text-center font-semibold transition-all',
                            orderType === 'takeaway'
                              ? 'border-transparent text-white shadow-xl'
                              : 'border-white/[0.08] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80',
                          )}
                          style={orderType === 'takeaway' ? { ...brandBg, boxShadow: brandGlow } : {}}
                        >
                          <ShoppingCart className="mx-auto mb-1 h-5 w-5" />
                          Para retirada
                        </button>
                      </div>
                    )}
                    <Button size="lg"
                      className="w-full gap-2 font-semibold text-white shadow-xl"
                      style={{ ...brandBg, boxShadow: brandGlow }}
                      disabled={sendToKitchen.isPending}
                      onClick={() => {
                        if (!selectedTable && !orderId) setStep('identity')
                        else sendToKitchen.mutate()
                      }}
                    >
                      {sendToKitchen.isPending
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <ChefHat className="h-4 w-4" />}
                      {sendToKitchen.isPending ? 'Enviando...' : `Enviar para cozinha · ${formatCurrency(localTotal)}`}
                    </Button>
                  </>
                )}

                {selectedTable && orderId && !isFullyPaid && (
                  <div className="flex gap-2">
                    <Button size="lg"
                      className="flex-1 gap-2 border border-white/[0.10] bg-white/[0.06] font-semibold text-white hover:bg-white/[0.11]"
                      onClick={() => setStep('menu')}
                    >
                      <ChevronRight className="h-5 w-5 rotate-180" />
                      Continuar Comprando
                    </Button>
                    <Button size="lg"
                      className="flex-1 gap-2 font-semibold text-white shadow-xl"
                      style={{ ...brandBg, boxShadow: brandGlow }}
                      disabled={requestBill.isPending}
                      onClick={() => requestBill.mutate()}
                    >
                      {requestBill.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <BellRing className="h-5 w-5" />}
                      {requestBill.isPending ? 'Solicitando...' : `Pedir Conta`}
                    </Button>
                  </div>
                )}

                {!selectedTable && (orderId || localCart.length > 0) && !isFullyPaid && localCart.length === 0 && (
                  <Button size="lg"
                    className="w-full gap-2 font-semibold text-white shadow-xl"
                    style={{ ...brandBg, boxShadow: brandGlow }}
                    onClick={() => {
                      setPaymentMode('full')
                      setSplitPeople(2)
                      setSplitPaidCount(0)
                      setSelectedPayment(null)
                      setStep('payment')
                    }}
                  >
                    <ReceiptText className="h-5 w-5" />
                    {`Pagar · ${formatCurrency(remaining)}`}
                  </Button>
                )}

                {isFullyPaid && (
                  <Button size="lg"
                    className="w-full gap-2 bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                    onClick={() => setStep('tracking')}
                  >
                    <CheckCircle2 className="h-5 w-5" /> Conta paga! Acompanhar pedido
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* ══ IDENTITY ═════════════════════════════════════════════════════ */}
          {step === 'identity' && (
            <motion.div key="identity"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="flex flex-1 flex-col items-center justify-center p-8"
            >
              <div className="w-full max-w-sm space-y-6">
                <div className="text-center">
                  <div
                    className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-3xl shadow-2xl"
                    style={{ ...brandBg, boxShadow: brandGlowLg }}
                  >
                    <Users className="h-9 w-9 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">Seus dados</h2>
                  <p className="mt-2 text-sm text-white/40">Para identificar seu pedido na retirada</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/60">Nome *</label>
                    <input autoFocus
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full rounded-2xl border border-white/[0.12] bg-white/[0.06] px-4 py-3.5 text-white outline-none placeholder:text-white/25 transition-all focus:border-white/[0.28] focus:bg-white/[0.09]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/60">WhatsApp *</label>
                    <input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      type="tel"
                      className="w-full rounded-2xl border border-white/[0.12] bg-white/[0.06] px-4 py-3.5 text-white outline-none placeholder:text-white/25 transition-all focus:border-white/[0.28] focus:bg-white/[0.09]"
                    />
                    <p className="mt-2 text-xs text-white/25">
                      Você receberá uma mensagem quando seu pedido estiver pronto
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button size="lg"
                    className="flex-1 border border-white/[0.10] bg-white/[0.06] text-white hover:bg-white/[0.11]"
                    onClick={() => setStep('cart')}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                  </Button>
                  <Button size="lg"
                    className="flex-1 gap-2 font-semibold text-white shadow-xl"
                    style={{ ...brandBg, boxShadow: brandGlow }}
                    disabled={!customerName.trim() || !customerPhone.trim() || sendToKitchen.isPending}
                    onClick={() => sendToKitchen.mutate()}
                  >
                    {sendToKitchen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChefHat className="h-4 w-4" />}
                    {sendToKitchen.isPending ? 'Enviando...' : 'Confirmar'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ CONFIRMED ════════════════════════════════════════════════════ */}
          {step === 'confirmed' && (
            <motion.div key="confirmed"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-1 flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500"
                style={{ boxShadow: '0 0 80px rgba(34, 197, 94, 0.45)' }}
              >
                <CheckCircle2 className="h-14 w-14 text-white" />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <h2 className="text-3xl font-black tracking-tight">Pedido enviado!</h2>
                {apiOrder?.orderNumber && (
                  <p className="mt-2 text-sm text-white/40">Comanda #{apiOrder.orderNumber}</p>
                )}
              </motion.div>

              {customerName && (
                <motion.p
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                  className="mt-4 text-xl font-semibold text-white/80"
                >
                  Olá, {customerName.split(' ')[0]}! 👋
                </motion.p>
              )}

              {customerPhone && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                  className="mt-6 max-w-xs rounded-2xl border border-white/[0.08] bg-white/[0.04] px-6 py-4"
                >
                  <p className="text-sm leading-relaxed text-white/50">
                    📱 Você receberá uma mensagem no{' '}
                    <span className="font-medium text-white/70">WhatsApp</span>{' '}
                    quando seu pedido estiver pronto para retirada
                  </p>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                className="mt-10"
              >
                <Button size="lg"
                  className="gap-2 px-14 text-base font-bold text-white shadow-2xl"
                  style={{ ...brandBg, boxShadow: brandGlow }}
                  onClick={resetAll}
                >
                  <Sparkles className="h-5 w-5" />
                  OK, entendi!
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* ══ PAYMENT ══════════════════════════════════════════════════════ */}
          {step === 'payment' && (
            <motion.div key="payment"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="flex flex-1 flex-col overflow-y-auto"
            >
              <div className="border-b border-white/[0.06] p-5">
                <div className="flex items-center gap-3">
                  <button onClick={() => setStep('cart')}
                    className="rounded-xl p-2 text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/70">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-xl font-bold tracking-tight">Pagamento</h2>
                </div>
              </div>

              <div className="mx-auto w-full max-w-lg flex-1 space-y-6 p-6">

                {apiOrder?.items?.length > 0 && (
                  <div className="divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03]">
                    {apiOrder.items.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="text-white/60">{item.quantity}× {item.product?.name}</span>
                        <span className="font-semibold">{formatCurrency(Number(item.totalPrice))}</span>
                      </div>
                    ))}
                    <div className="space-y-1.5 px-4 py-3.5">
                      <div className="flex justify-between text-sm text-white/40">
                        <span>Total</span><span>{formatCurrency(orderTotal)}</span>
                      </div>
                      {alreadyPaid > 0 && (
                        <div className="flex justify-between text-sm text-emerald-400">
                          <span>Já pago</span><span>− {formatCurrency(alreadyPaid)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1.5 text-xl font-black">
                        <span>Restante</span>
                        <span style={{ color: brandText }}>{formatCurrency(remaining)}</span>
                      </div>
                    </div>
                  </div>
                )}


                {/* Cupom */}
                <div className="space-y-2">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-white/25">Cupom/Promoção</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Código do cupom..."
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase())
                        setCouponError('')
                      }}
                      className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/25 outline-none transition hover:bg-white/[0.08] focus:border-cyan-500/50"
                    />
                    <button
                      onClick={applyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="rounded-lg bg-white/[0.08] px-4 py-2 font-bold text-white hover:bg-white/[0.14] disabled:opacity-50"
                    >
                      {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                    </button>
                  </div>
                  {couponError && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <p className="text-xs text-red-300">{couponError}</p>
                    </div>
                  )}
                  {appliedCoupon && (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                      <div>
                        <p className="font-bold text-emerald-400">{appliedCoupon.code}</p>
                        <p className="text-xs text-emerald-300">−{formatCurrency(discountAmount)}</p>
                      </div>
                      <button
                        onClick={() => {
                          setAppliedCoupon(null)
                          setDiscountAmount(0)
                        }}
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {/* Payment mode */}
                <div>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-white/25">Como pagar?</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { mode: 'full' as PaymentMode, label: 'Conta Inteira', sub: formatCurrency(remaining), icon: CreditCard },
                      { mode: 'split' as PaymentMode, label: 'Dividir Conta', sub: 'Entre pessoas', icon: Split },
                    ].map(({ mode, label, sub, icon: Icon }) => (
                      <button key={mode}
                        onClick={() => { setPaymentMode(mode); setSelectedPayment(null); setSplitPaidCount(0) }}
                        className={cn(
                          'flex flex-col items-center gap-2.5 rounded-2xl border-2 p-5 text-center transition-all',
                          paymentMode === mode
                            ? 'border-transparent text-white shadow-xl'
                            : 'border-white/[0.08] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80',
                        )}
                        style={paymentMode === mode ? { ...brandBg, boxShadow: brandGlow } : {}}
                      >
                        <Icon className="h-6 w-6" />
                        <div>
                          <p className="text-sm font-bold">{label}</p>
                          <p className="mt-0.5 text-xs opacity-60">{sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Split options */}
                {paymentMode === 'split' && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Número de pessoas</p>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setSplitPeople((n) => Math.max(2, n - 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.08] transition-colors hover:bg-white/[0.14]">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center text-xl font-black">{splitPeople}</span>
                        <button onClick={() => setSplitPeople((n) => Math.min(20, n + 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-white transition-opacity hover:opacity-80"
                          style={{ ...brandBg }}>
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3">
                      <span className="text-sm text-white/40">Valor por pessoa</span>
                      <span className="text-xl font-black" style={{ color: brandText }}>
                        {formatCurrency(splitAmount)}
                      </span>
                    </div>

                    <div>
                      <div className="flex gap-1.5">
                        {Array.from({ length: splitPeople }).map((_, i) => (
                          <div key={i}
                            className={cn('h-1.5 flex-1 rounded-full transition-all', i >= splitPaidCount && 'bg-white/10')}
                            style={i < splitPaidCount ? brandBg : {}}
                          />
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-white/30">
                        {splitPaidCount} de {splitPeople} pagaram
                      </p>
                    </div>

                    {splitPaidCount > 0 && splitPaidCount < splitPeople && (
                      <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5 text-sm">
                        <Users className="h-4 w-4 text-white/30" />
                        <span className="text-white/50">
                          Pessoa <strong className="text-white">{splitPaidCount + 1}</strong> de {splitPeople} — {formatCurrency(splitAmount)}
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Payment method */}
                <div>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-white/25">
                    {paymentMode === 'split' && splitPaidCount > 0 ? `Pessoa ${splitPaidCount + 1} — ` : ''}
                    Forma de pagamento
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {paymentMethods.map((m) => (
                      <motion.button key={m.key}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedPayment(m.key)}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-all',
                          selectedPayment === m.key
                            ? 'border-transparent text-white shadow-xl'
                            : 'border-white/[0.08] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80',
                        )}
                        style={selectedPayment === m.key ? { ...brandBg, boxShadow: brandGlow } : {}}
                      >
                        <m.icon className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-semibold">{m.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <Button size="lg"
                  className="w-full gap-2 font-semibold text-white shadow-xl"
                  style={{
                    ...brandBg,
                    boxShadow: selectedPayment ? brandGlow : 'none',
                    opacity: selectedPayment ? 1 : 0.4,
                  }}
                  disabled={!selectedPayment || makePayment.isPending}
                  onClick={() => makePayment.mutate()}
                >
                  {makePayment.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  {paymentMode === 'split'
                    ? `Confirmar — Pessoa ${splitPaidCount + 1} (${formatCurrency(splitAmount)})`
                    : `Confirmar Pagamento · ${formatCurrency(remaining)}`}
                </Button>

                {((remaining <= 0.01 && orderId) || (makePayment.isSuccess && paymentMode === 'full')) && (
                  <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                    className="space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.08] p-5 text-center">
                    <div className="flex items-center justify-center gap-2 font-bold text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" /> Pagamento confirmado!
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm"
                        className="flex-1 border-white/[0.10] text-white hover:bg-white/[0.08]"
                        onClick={() => setStep('cart')}>
                        Adicionar mais
                      </Button>
                      <Button size="sm"
                        className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => setStep('tracking')}>
                        Acompanhar
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ══ BILL REQUESTED ═══════════════════════════════════════════════ */}
          {step === 'bill-requested' && (
            <motion.div key="bill-requested"
              initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="mb-6 flex h-28 w-28 items-center justify-center rounded-full"
                style={{ ...brandBg, boxShadow: brandGlowLg }}
              >
                <BellRing className="h-14 w-14 text-white" />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <h2 className="text-3xl font-black tracking-tight">Conta solicitada!</h2>
                {selectedTable && <p className="mt-2 text-sm text-white/40">Mesa {selectedTable.number}</p>}
                <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-white/40">
                  Um garçom foi notificado e virá até você em breve para efetuar o pagamento.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="mt-8 w-full max-w-sm space-y-2 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-5"
              >
                <div className="flex justify-between text-sm text-white/50">
                  <span>Total do pedido</span>
                  <span>{formatCurrency(orderTotal)}</span>
                </div>
                <div className="flex justify-between border-t border-white/[0.06] pt-2 text-xl font-black">
                  <span>A pagar</span>
                  <span style={{ color: brandText }}>{formatCurrency(remaining)}</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
                className="mt-8 flex gap-4"
              >
                <button onClick={() => setStep('cart')}
                  className="text-sm text-white/25 transition-colors hover:text-white/50">
                  ← Voltar ao pedido
                </button>
                <span className="text-white/[0.08]">|</span>
                <button onClick={() => setStep('tracking')}
                  className="text-sm text-white/25 transition-colors hover:text-white/50">
                  Acompanhar itens
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ══ TRACKING ═════════════════════════════════════════════════════ */}
          {step === 'tracking' && (
            <motion.div key="tracking"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                className="mb-6 flex h-28 w-28 items-center justify-center rounded-full shadow-2xl"
                style={{ ...brandBg, boxShadow: brandGlowLg }}
              >
                <ChefHat className="h-14 w-14 text-white" />
              </motion.div>

              <h2 className="mb-1 text-3xl font-black tracking-tight">Pedido #{apiOrder?.orderNumber}</h2>
              {selectedTable && <p className="mb-1 text-sm text-white/35">Mesa {selectedTable.number}</p>}
              <p className="mb-8 text-sm text-white/40">Acompanhe o status do seu pedido</p>

              <div className="w-full max-w-md space-y-2.5">

              <div className="mb-6 w-full max-w-md rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 flex items-center gap-3">
                <Clock className="h-5 w-5 text-cyan-400" />
                <div className="text-left">
                  <p className="text-sm font-bold text-cyan-300">Tempo estimado</p>
                  <p className="text-xs text-cyan-300/60">~{estimatedTime} minutos</p>
                </div>
              </div>
                {apiOrder?.items?.map((item: any, i: number) => {
                  const s = itemStatusMap[item.status] ?? itemStatusMap.PENDING
                  return (
                    <motion.div key={item.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.08] text-xs font-black">
                          {item.quantity}×
                        </span>
                        <span className="text-sm font-medium">{item.product?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', s.dot)} />
                        <span className={cn('text-xs font-semibold', s.color)}>{s.label}</span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {apiOrder?.items?.every((i: any) => i.status === 'READY' || i.status === 'DELIVERED') && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-8 flex flex-col items-center">
                  <div className="mb-3 flex items-center gap-2.5 text-emerald-400">
                    <CheckCircle2 className="h-7 w-7" />
                    <span className="text-2xl font-black">Pedido pronto!</span>
                  </div>
                  <p className="text-sm text-white/40">Dirija-se ao balcão para retirar</p>
                </motion.div>
              )}

              <div className="mt-8 flex gap-4">
                <button onClick={() => setStep('cart')}
                  className="text-sm text-white/25 transition-colors hover:text-white/50">
                  ← Voltar ao pedido
                </button>
                <span className="text-white/[0.08]">|</span>
                <button onClick={resetAll}
                  className="text-sm text-white/25 transition-colors hover:text-white/50">
                  Novo pedido
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      {/* MODAL DE DETALHES DO PRODUTO */}
      <AnimatePresence>
        {selectedProductModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-black/50 md:items-center"
            onClick={() => setSelectedProductModal(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-3xl bg-[#09090e] p-6 md:max-w-md md:rounded-2xl"
            >
              <button
                onClick={() => setSelectedProductModal(null)}
                className="absolute right-4 top-4 rounded-lg p-2 text-white/40 hover:bg-white/[0.08]"
              >
                <X className="h-5 w-5" />
              </button>

              {selectedProductModal.imageUrl && (
                <img
                  src={selectedProductModal.imageUrl}
                  alt={selectedProductModal.name}
                  className="mb-4 h-48 w-full rounded-2xl object-cover"
                />
              )}

              <h3 className="mb-2 text-2xl font-bold">{selectedProductModal.name}</h3>

              {selectedProductModal.description && (
                <p className="mb-4 text-sm text-white/60">{selectedProductModal.description}</p>
              )}

              <div className="mb-4 flex items-center justify-between rounded-xl bg-white/[0.05] p-3">
                <span className="text-white/60">Preço</span>
                <span className="text-xl font-bold" style={{ color: BRAND_TEXT }}>
                  {formatCurrency(selectedProductModal.price)}
                </span>
              </div>

              <button
                onClick={() => {
                  const existing = localCart.find((i) => i.productId === selectedProductModal.id)
                  if (existing) {
                    setLocalCart(
                      localCart.map((i) =>
                        i.productId === selectedProductModal.id
                          ? { ...i, quantity: i.quantity + 1 }
                          : i
                      )
                    )
                  } else {
                    setLocalCart([
                      ...localCart,
                      {
                        productId: selectedProductModal.id,
                        name: selectedProductModal.name,
                        price: selectedProductModal.price,
                        imageUrl: selectedProductModal.imageUrl,
                        quantity: 1,
                        notes: '',
                      },
                    ])
                  }
                  setSelectedProductModal(null)
                }}
                className="w-full rounded-xl py-3 font-bold text-white"
                style={{ background: BRAND_GRADIENT, boxShadow: BRAND_GLOW }}
              >
                Adicionar ao Carrinho
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}
