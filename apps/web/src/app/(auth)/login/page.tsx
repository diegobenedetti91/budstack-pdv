'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Loader2, ChefHat, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

const schema = z.object({
  tenantSlug: z.string().min(1, 'Informe o restaurante'),
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Informe a senha'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/login', data)
      setAuth(res.data.accessToken, res.data.refreshToken, res.data.user)
      router.push('/dashboard')
    } catch {
      toast({ title: 'Erro ao entrar', description: 'Email, senha ou restaurante incorretos.', variant: 'destructive' })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      {/* Card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/30">
            <ChefHat className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">BudStack PDV</h1>
            <p className="text-sm text-slate-400">Sistema de Gestão para Restaurantes</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Restaurante */}
          <div className="space-y-1.5">
            <Label className="text-slate-300">Seu Restaurante</Label>
            <Input
              {...register('tenantSlug')}
              placeholder="meu-restaurante"
              className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:ring-orange-500/20"
            />
            {errors.tenantSlug && <p className="text-xs text-red-400">{errors.tenantSlug.message}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-slate-300">Email</Label>
            <Input
              {...register('email')}
              type="email"
              placeholder="seu@email.com"
              className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:ring-orange-500/20"
            />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>

          {/* Senha */}
          <div className="space-y-1.5">
            <Label className="text-slate-300">Senha</Label>
            <div className="relative">
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="border-white/10 bg-white/5 pr-10 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:ring-orange-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-500 font-semibold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/25 transition-all"
            size="lg"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <a href="/register" className="text-sm text-slate-400 hover:text-orange-400 transition-colors">
            Não tem conta? <span className="font-medium">Cadastre seu restaurante</span>
          </a>
        </div>
      </div>
    </motion.div>
  )
}
