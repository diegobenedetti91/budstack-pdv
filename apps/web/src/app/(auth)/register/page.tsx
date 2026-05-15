'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Loader2, ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

const schema = z.object({
  tenantName: z.string().min(2, 'Mínimo 2 caracteres'),
  tenantSlug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
  adminName: z.string().min(2),
  adminEmail: z.string().email('Email inválido'),
  adminPassword: z.string().min(8, 'Mínimo 8 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/register', data)
      setAuth(res.data.accessToken, res.data.refreshToken, res.data.user)
      router.push('/dashboard/configuracoes')
      toast({ title: 'Bem-vindo!', description: 'Restaurante criado com sucesso. Configure os dados da empresa.' })
    } catch (err: any) {
      toast({
        title: 'Erro no cadastro',
        description: err?.response?.data?.message ?? 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/30">
            <ChefHat className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Cadastrar Restaurante</h1>
            <p className="text-sm text-slate-400">Crie sua conta no BudStack PDV</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Nome do Restaurante</Label>
              <Input {...register('tenantName')} placeholder="Pizzaria do João" className="border-white/10 bg-white/5 text-white placeholder:text-slate-500" />
              {errors.tenantName && <p className="text-xs text-red-400">{errors.tenantName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Identificador (slug)</Label>
              <Input {...register('tenantSlug')} placeholder="pizzaria-joao" className="border-white/10 bg-white/5 text-white placeholder:text-slate-500" />
              {errors.tenantSlug && <p className="text-xs text-red-400">{errors.tenantSlug.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">Seu Nome</Label>
            <Input {...register('adminName')} placeholder="João Silva" className="border-white/10 bg-white/5 text-white placeholder:text-slate-500" />
            {errors.adminName && <p className="text-xs text-red-400">{errors.adminName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">Email</Label>
            <Input {...register('adminEmail')} type="email" placeholder="joao@email.com" className="border-white/10 bg-white/5 text-white placeholder:text-slate-500" />
            {errors.adminEmail && <p className="text-xs text-red-400">{errors.adminEmail.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">Senha</Label>
            <Input {...register('adminPassword')} type="password" placeholder="••••••••" className="border-white/10 bg-white/5 text-white placeholder:text-slate-500" />
            {errors.adminPassword && <p className="text-xs text-red-400">{errors.adminPassword.message}</p>}
          </div>

          <Button type="submit" disabled={isSubmitting} className="mt-2 w-full bg-orange-500 font-semibold hover:bg-orange-600 shadow-lg shadow-orange-500/25" size="lg">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Restaurante'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <a href="/login" className="text-sm text-slate-400 hover:text-orange-400 transition-colors">
            Já tem conta? <span className="font-medium">Fazer login</span>
          </a>
        </div>
      </div>
    </motion.div>
  )
}
