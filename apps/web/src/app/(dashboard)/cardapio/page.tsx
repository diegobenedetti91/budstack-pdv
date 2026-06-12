'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight,
  ChefHat, Loader2, X, Check, ImageIcon, Tag, DollarSign,
  GripVertical, Eye, EyeOff,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/auth.store'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, cn } from '@/lib/utils'

interface Category { id: string; name: string; icon?: string; _count?: { products: number } }
interface Product {
  id: string; categoryId: string; name: string; description?: string
  price: number; costPrice?: number; imageUrl?: string; code?: string
  isActive: boolean; isAvailable: boolean; category?: Category
  stockControl: boolean; stockQuantity: number; stockMinimum: number
  preparationTimeMinutes?: number
}

const productSchema = z.object({
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  name: z.string().min(1, 'Informe o nome'),
  description: z.string().optional(),
  price: z.coerce.number().positive('Preço deve ser positivo'),
  costPrice: z.coerce.number().min(0).optional().or(z.literal('')),
  imageUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  code: z.string().optional(),
  preparationTimeMinutes: z.coerce.number().int().min(1, 'Tempo mínimo 1 minuto').default(5),
  stockControl: z.boolean().default(false),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  stockMinimum: z.coerce.number().int().min(0).default(0),
})

const categorySchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  icon: z.string().optional(),
})

type ProductForm = z.infer<typeof productSchema>
type CategoryForm = z.infer<typeof categorySchema>

function CategoryModal({ onClose, editing }: { onClose: () => void; editing?: Category }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: editing ? { name: editing.name, icon: editing.icon ?? '' } : {},
  })

  const save = async (data: CategoryForm) => {
    try {
      if (editing) await api.patch(`/categories/${editing.id}`, data)
      else await api.post('/categories', data)
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast({ title: editing ? 'Categoria atualizada!' : 'Categoria criada!' })
      onClose()
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">{editing ? 'Editar Categoria' : 'Nova Categoria'}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit(save)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input {...register('name')} placeholder="Ex: Pratos Principais" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Ícone (emoji)</Label>
            <Input {...register('icon')} placeholder="🍽️" className="text-xl" />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-cyan-500 hover:bg-cyan-600">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function ProductModal({ onClose, editing, categories }: { onClose: () => void; editing?: Product; categories: Category[] }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: editing ? {
      categoryId: editing.categoryId,
      name: editing.name,
      description: editing.description ?? '',
      price: editing.price,
      costPrice: editing.costPrice ?? '',
      imageUrl: editing.imageUrl ?? '',
      code: editing.code ?? '',
      preparationTimeMinutes: editing.preparationTimeMinutes ?? 5,
      stockControl: editing.stockControl,
      stockQuantity: editing.stockQuantity,
      stockMinimum: editing.stockMinimum,
    } : { stockControl: false, stockQuantity: 0, stockMinimum: 0, preparationTimeMinutes: 5 },
  })

  const stockControl = watch('stockControl')

  const imageUrl = watch('imageUrl')

  const save = async (data: ProductForm) => {
    try {
      const payload = {
        ...data,
        imageUrl: data.imageUrl || undefined,
        code: data.code || undefined,
        costPrice: data.costPrice === '' ? undefined : data.costPrice,
      }
      if (editing) await api.patch(`/products/${editing.id}`, payload)
      else await api.post('/products', payload)
      qc.invalidateQueries({ queryKey: ['products'] })
      toast({ title: editing ? 'Produto atualizado!' : 'Produto criado!' })
      onClose()
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">{editing ? 'Editar Produto' : 'Novo Produto'}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit(save)} className="space-y-4">
          {/* Image preview */}
          <div className="flex items-start gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
              ) : (
                <ImageIcon className="h-8 w-8 text-slate-300" />
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>URL da Imagem</Label>
              <div className="flex gap-2">
                <Input {...register('imageUrl')} placeholder="https://..." />
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  className="hidden"
onChange={async (e) => {
                    const file = e.currentTarget.files?.[0]
                    if (!file) return
                    const formData = new FormData()
                    formData.append('file', file)
                    try {
                      const token = useAuthStore.getState().accessToken || ''
                      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/uploads', {
                        method: 'POST',
                        body: formData,
                        headers: { 'Authorization': 'Bearer ' + token }
                      })
                      if (!res.ok) throw new Error('Upload falhou')
                      const { url } = await res.json()
                      setValue('imageUrl', url)
                    } catch (error) {
                      const msg = error instanceof Error ? error.message : 'Erro desconhecido'
                      alert('Erro ao fazer upload: ' + msg)
                    }
                  }}

                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('imageUpload')?.click()}
                  className="shrink-0"
                >
                  Upload
                </Button>
              </div>
              {errors.imageUrl && <p className="text-xs text-red-500">{errors.imageUrl.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Categoria *</Label>
              <Select onValueChange={(v) => setValue('categoryId', v)} defaultValue={watch('categoryId')}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId.message}</p>}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Nome *</Label>
              <Input {...register('name')} placeholder="Ex: Picanha na brasa 300g" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Descrição</Label>
              <textarea
                {...register('description')}
                placeholder="Descreva o produto..."
                rows={2}
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Preço (R$) *</Label>
              <Input {...register('price')} type="number" step="0.01" placeholder="0,00" />
              {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Código PDV</Label>
              <Input {...register('code')} placeholder="001" />
            </div>

            <div className="space-y-1.5">
              <Label>Valor Custo (R$)</Label>
              <Input {...register('costPrice')} type="number" step="0.01" placeholder="0,00" />
            </div>

            <div className="space-y-1.5">
              <Label>Tempo de Preparo (minutos) ⏱️</Label>
              <Input {...register('preparationTimeMinutes')} type="number" min="1" placeholder="5" />
              <p className="text-xs text-slate-400">Tempo estimado de preparo do item</p>
              {errors.preparationTimeMinutes && <p className="text-xs text-red-500">{errors.preparationTimeMinutes.message}</p>}
            </div>
          </div>

          {/* Estoque */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Controle de Estoque</p>
                <p className="text-xs text-slate-400">Ativar para monitorar quantidade disponível</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={stockControl}
                onClick={() => setValue('stockControl', !stockControl)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  stockControl ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-700',
                )}
              >
                <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', stockControl ? 'translate-x-6' : 'translate-x-1')} />
              </button>
            </div>
            {stockControl && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label>Quantidade em Estoque</Label>
                  <Input {...register('stockQuantity')} type="number" min="0" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Estoque Mínimo</Label>
                  <Input {...register('stockMinimum')} type="number" min="0" placeholder="0" />
                  <p className="text-xs text-slate-400">Alerta quando atingir</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-cyan-500 hover:bg-cyan-600">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function CardapioPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string | null>(null)
  const [catModal, setCatModal] = useState<{ open: boolean; editing?: Category }>({ open: false })
  const [prodModal, setProdModal] = useState<{ open: boolean; editing?: Product }>({ open: false })
  const [view, setView] = useState<'products' | 'categories'>('products')

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  })

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  })

  const toggleAvail = useMutation({
    mutationFn: (id: string) => api.patch(`/products/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast({ title: 'Produto removido' }) },
  })

  const deleteCategory = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast({ title: 'Categoria removida' }) },
  })

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCat || p.categoryId === filterCat
    return matchSearch && matchCat
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cardápio</h1>
          <p className="text-sm text-slate-500">{products.length} produtos em {categories.length} categorias</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCatModal({ open: true })} className="gap-2">
            <Tag className="h-4 w-4" /> Nova Categoria
          </Button>
          <Button onClick={() => setProdModal({ open: true })} className="gap-2 bg-cyan-500 hover:bg-cyan-600 shadow-sm shadow-cyan-500/25">
            <Plus className="h-4 w-4" /> Novo Produto
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900 w-fit">
        {[{ key: 'products', label: 'Produtos' }, { key: 'categories', label: 'Categorias' }].map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key as any)}
            className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors', view === t.key ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'products' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto..." className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilterCat(null)}
                className={cn('rounded-xl px-3 py-1.5 text-xs font-medium transition-colors', !filterCat ? 'bg-cyan-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-cyan-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300')}
              >Todas</button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFilterCat(c.id === filterCat ? null : c.id)}
                  className={cn('flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors', c.id === filterCat ? 'bg-cyan-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-cyan-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300')}
                >
                  {c.icon && <span>{c.icon}</span>} {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products table */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">Produto</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">Categoria</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-400">Preço</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-400">Custo</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-400">Estoque</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-400">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {isLoading ? (
                    <tr><td colSpan={7} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-500" /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-slate-400">Nenhum produto encontrado</td></tr>
                  ) : filtered.map((product, i) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className={cn('group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30', !product.isAvailable && 'opacity-60')}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <ChefHat className="h-5 w-5 text-slate-300" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{product.name}</p>
                            {product.description && <p className="text-xs text-slate-400 line-clamp-1">{product.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          {product.category?.icon} {product.category?.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                        {product.costPrice ? formatCurrency(product.costPrice) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {product.stockControl ? (
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                            product.stockQuantity <= product.stockMinimum
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                          )}>
                            {product.stockQuantity} un.
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => toggleAvail.mutate(product.id)} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors">
                          {product.isAvailable ? (
                            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <Eye className="h-3 w-3" /> Disponível
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-500 dark:bg-slate-800">
                              <EyeOff className="h-3 w-3" /> Indisponível
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={() => setProdModal({ open: true, editing: product })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteProduct.mutate(product.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {view === 'categories' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="group rounded-2xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-xl dark:bg-cyan-900/20">
                  {cat.icon ?? '🍽️'}
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => setCatModal({ open: true, editing: cat })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteCategory.mutate(cat.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">{cat.name}</p>
              <p className="text-sm text-slate-500">{cat._count?.products ?? 0} produto(s)</p>
            </motion.div>
          ))}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCatModal({ open: true })}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-6 text-slate-400 transition-colors hover:border-cyan-300 hover:text-cyan-500 dark:border-slate-700"
          >
            <Plus className="h-7 w-7" />
            <span className="text-sm font-medium">Nova Categoria</span>
          </motion.button>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {catModal.open && <CategoryModal onClose={() => setCatModal({ open: false })} editing={catModal.editing} />}
        {prodModal.open && <ProductModal onClose={() => setProdModal({ open: false })} editing={prodModal.editing} categories={categories} />}
      </AnimatePresence>
    </div>
  )
}
