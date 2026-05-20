'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, X, Check, Loader2, Shield, UserCheck, UserX, Key } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { UserRole } from '@budstack/types'

interface User {
  id: string; name: string; email: string; role: UserRole
  isActive: boolean; avatarUrl?: string; createdAt: string
}

const roleConfig: Record<UserRole, { label: string; color: string; bg: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
  ADMIN: { label: 'Administrador', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  MANAGER: { label: 'Gerente', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  CASHIER: { label: 'Caixa', color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/30' },
  WAITER: { label: 'Garçom', color: 'text-cyan-700 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  KITCHEN: { label: 'Cozinha', color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
}

const userSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
  role: z.nativeEnum(UserRole),
  pin: z.string().max(6).optional().or(z.literal('')),
})
type UserForm = z.infer<typeof userSchema>

function UserModal({ onClose, editing }: { onClose: () => void; editing?: User }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: editing ? { name: editing.name, email: editing.email, role: editing.role, password: '', pin: '' } : { role: UserRole.WAITER },
  })

  const save = async (data: UserForm) => {
    try {
      const payload: any = { name: data.name, email: data.email, role: data.role }
      if (data.password) payload.password = data.password
      if (data.pin) payload.pin = data.pin
      if (editing) await api.patch(`/users/${editing.id}`, payload)
      else await api.post('/users', { ...payload, password: data.password })
      qc.invalidateQueries({ queryKey: ['users'] })
      toast({ title: editing ? 'Usuário atualizado!' : 'Usuário criado!' })
      onClose()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err?.response?.data?.message, variant: 'destructive' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">{editing ? 'Editar Usuário' : 'Novo Usuário'}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit(save)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome completo</Label>
              <Input {...register('name')} placeholder="João Silva" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Email</Label>
              <Input {...register('email')} type="email" placeholder="joao@restaurante.com" />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Função</Label>
              <Select onValueChange={(v) => setValue('role', v as UserRole)} defaultValue={watch('role')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleConfig).filter(([k]) => k !== 'SUPER_ADMIN').map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{editing ? 'Nova Senha' : 'Senha *'}</Label>
              <Input {...register('password')} type="password" placeholder={editing ? 'Deixe em branco para manter' : '••••••'} />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>PIN (4-6 dígitos)</Label>
              <Input {...register('pin')} type="number" placeholder="1234" maxLength={6} />
            </div>
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

export default function UsuariosPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ open: boolean; editing?: User }>({ open: false })

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  })

  const toggleActive = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  const grouped = Object.entries(roleConfig)
    .filter(([key]) => key !== 'SUPER_ADMIN')
    .map(([role, config]) => ({
      role: role as UserRole,
      config,
      users: users.filter((u) => u.role === role),
    }))
    .filter((g) => g.users.length > 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Usuários</h1>
          <p className="text-sm text-slate-500">{users.length} usuário(s) cadastrado(s)</p>
        </div>
        <Button onClick={() => setModal({ open: true })} className="gap-2 bg-cyan-500 hover:bg-cyan-600 shadow-sm shadow-cyan-500/25">
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(roleConfig).filter(([k]) => k !== 'SUPER_ADMIN').map(([role, config]) => {
          const count = users.filter((u) => u.role === role && u.isActive).length
          return (
            <div key={role} className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{count}</p>
              <p className="text-xs text-slate-500">{config.label}</p>
            </div>
          )
        })}
      </div>

      {/* Users list */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-cyan-500" /></div>
      ) : (
        <div className="space-y-5">
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300">
              <Shield className="mb-3 h-12 w-12" />
              <p className="text-slate-400">Nenhum usuário cadastrado</p>
            </div>
          ) : grouped.map(({ role, config, users: groupUsers }) => (
            <div key={role}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{config.label}s</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {groupUsers.map((user, i) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      'group flex items-center gap-3 rounded-2xl border p-4 transition-shadow hover:shadow-sm',
                      user.isActive
                        ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                        : 'border-slate-100 bg-slate-50 opacity-60 dark:border-slate-800/50 dark:bg-slate-900/50',
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', user.isActive ? 'bg-cyan-500' : 'bg-slate-400')}>
                      {initials(user.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => setModal({ open: true, editing: user })}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleActive.mutate(user.id)}
                        className={cn('rounded-lg p-1.5 transition-colors', user.isActive
                          ? 'text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20'
                          : 'text-slate-400 hover:bg-green-50 hover:text-green-500 dark:hover:bg-green-900/20'
                        )}
                      >
                        {user.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modal.open && <UserModal onClose={() => setModal({ open: false })} editing={modal.editing} />}
      </AnimatePresence>
    </div>
  )
}
