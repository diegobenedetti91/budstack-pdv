'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import {
  Loader2, Eye, EyeOff, ChefHat, UtensilsCrossed,
  BarChart3, Monitor, ShieldCheck,
} from 'lucide-react'
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

const features = [
  { icon: UtensilsCrossed, text: 'PDV completo com gestão de mesas' },
  { icon: ChefHat,         text: 'KDS digital para a cozinha' },
  { icon: Monitor,         text: 'Autoatendimento via QR Code' },
  { icon: BarChart3,       text: 'Relatórios em tempo real' },
]

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
      toast({
        title: 'Erro ao entrar',
        description: 'Email, senha ou restaurante incorretos.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex min-h-screen w-full">

      {/* ── Left panel — brand ───────────────────────────────────────────── */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex lg:w-[46%]">
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(145deg, #0a0a18 0%, #0d1a2d 40%, #0f0a1e 100%)' }}
        />
        {/* Decorative glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)' }} />
          <div className="absolute -right-10 bottom-1/4 h-64 w-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)' }} />
          <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)' }} />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #22D3EE 0%, #3B82F6 50%, #8B5CF6 100%)',
                boxShadow: '0 4px 20px rgba(6,182,212,0.3)',
              }}
            >
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <span
                className="text-lg font-bold"
                style={{
                  background: 'linear-gradient(135deg, #22D3EE 0%, #3B82F6 50%, #8B5CF6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Bud
              </span>
              <span className="text-lg font-bold text-white">stack</span>
            </div>
          </div>
        </div>

        {/* Center hero */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-500/70">
              Sistema de Gestão
            </p>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-white">
              Venda mais.<br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #22D3EE 0%, #8B5CF6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Automatize tudo.
              </span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/40">
              Plataforma completa para restaurantes —<br />
              do pedido ao caixa, do kiosk à cozinha.
            </p>
          </motion.div>

          {/* Feature list */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-10 space-y-3.5"
          >
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.08 }}
                className="flex items-center gap-3"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))',
                    border: '1px solid rgba(6,182,212,0.2)',
                  }}
                >
                  <f.icon className="h-4 w-4 text-cyan-400" />
                </div>
                <span className="text-sm text-white/55">{f.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-white/20" />
          <p className="text-xs text-white/20">Multi-tenant · Dados isolados por restaurante</p>
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12">
        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #22D3EE 0%, #3B82F6 50%, #8B5CF6 100%)',
              boxShadow: '0 8px 24px rgba(6,182,212,0.3)',
            }}
          >
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">BudStack PDV</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Entrar na conta</h2>
            <p className="mt-1.5 text-sm text-white/35">Acesse o painel do seu restaurante</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-white/60">Restaurante</Label>
              <Input
                {...register('tenantSlug')}
                placeholder="meu-restaurante"
                autoComplete="off"
                className="border-white/[0.10] bg-white/[0.05] text-white placeholder:text-white/20
                  focus:border-cyan-500/50 focus:bg-white/[0.07] focus:ring-0
                  transition-colors rounded-xl h-11"
              />
              {errors.tenantSlug && <p className="text-xs text-red-400">{errors.tenantSlug.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-white/60">Email</Label>
              <Input
                {...register('email')}
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                className="border-white/[0.10] bg-white/[0.05] text-white placeholder:text-white/20
                  focus:border-cyan-500/50 focus:bg-white/[0.07] focus:ring-0
                  transition-colors rounded-xl h-11"
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-white/60">Senha</Label>
              <div className="relative">
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="border-white/[0.10] bg-white/[0.05] pr-11 text-white placeholder:text-white/20
                    focus:border-cyan-500/50 focus:bg-white/[0.07] focus:ring-0
                    transition-colors rounded-xl h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
                className="w-full font-semibold text-white shadow-xl transition-opacity hover:opacity-90 rounded-xl h-11"
                style={{
                  background: 'linear-gradient(135deg, #22D3EE 0%, #3B82F6 50%, #8B5CF6 100%)',
                  boxShadow: '0 8px 24px rgba(6,182,212,0.25)',
                }}
              >
                {isSubmitting
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : 'Entrar'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <a href="/register"
              className="text-sm text-white/30 transition-colors hover:text-white/60">
              Não tem conta?{' '}
              <span
                className="font-medium"
                style={{
                  background: 'linear-gradient(135deg, #22D3EE, #8B5CF6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Cadastre seu restaurante
              </span>
            </a>
          </div>
        </motion.div>
      </div>

    </div>
  )
}
