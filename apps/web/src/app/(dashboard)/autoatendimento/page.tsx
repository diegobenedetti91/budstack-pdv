'use client'

import { useQuery } from '@tanstack/react-query'
import { Monitor, ExternalLink, QrCode, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

export default function AutoatendimentoPage() {
  const [copied, setCopied] = useState(false)
  const user = useAuthStore((s) => s.user)

  const { data: tenant } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: () => api.get('/tenants/me').then((r) => r.data),
  })

  const kioskUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/kiosk/${tenant?.slug ?? ''}`
    : ''

  const copy = () => {
    navigator.clipboard.writeText(kioskUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Autoatendimento</h1>
        <p className="text-sm text-slate-500">Tela de totem para pedidos self-service</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-cyan-500" /> Link do Kiosk
            </CardTitle>
            <CardDescription>
              Abra esta URL em um tablet ou totem para os clientes fazerem pedidos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <span className="flex-1 truncate font-mono text-sm text-slate-600 dark:text-slate-300">{kioskUrl || 'Configure o slug do restaurante primeiro'}</span>
              <button onClick={copy} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(kioskUrl, '_blank')}>
                <ExternalLink className="h-4 w-4" /> Abrir Kiosk
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-cyan-500" /> Como funciona
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {[
                'Cliente acessa a tela do kiosk (totem ou tablet)',
                'Navega pelo cardápio e adiciona itens ao carrinho',
                'Escolhe a forma de pagamento (TEF, PIX, etc.)',
                'Pedido vai direto para a cozinha (KDS)',
                'Cliente acompanha o status em tempo real na tela',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
