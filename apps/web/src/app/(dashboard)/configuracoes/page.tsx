'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, MapPin, Phone, Receipt, CreditCard, Printer, Palette, Loader2, Save, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

const schema = z.object({
  tradeName: z.string().min(1),
  companyName: z.string().min(1),
  cnpj: z.string().min(14),
  stateRegistration: z.string().optional(),
  street: z.string().min(1),
  number: z.string().min(1),
  complement: z.string().optional(),
  neighborhood: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zipCode: z.string().min(8),
  phone: z.string().min(10),
  email: z.string().email(),
  website: z.string().optional(),
  taxRegime: z.string(),
  satSerialNumber: z.string().optional(),
  satActivationCode: z.string().optional(),
  nfceCscId: z.string().optional(),
  nfceCscToken: z.string().optional(),
  tefProvider: z.string().optional(),
  tefIpAddress: z.string().optional(),
  tefPort: z.coerce.number().optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const tabs = [
  { id: 'empresa', label: 'Empresa', icon: Building2 },
  { id: 'endereco', label: 'Endereço', icon: MapPin },
  { id: 'contato', label: 'Contato', icon: Phone },
  { id: 'fiscal', label: 'Fiscal', icon: Receipt },
  { id: 'tef', label: 'TEF', icon: CreditCard },
  { id: 'aparencia', label: 'Aparência', icon: Palette },
]

export default function ConfiguracoesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data: company, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: () => api.get('/company').then((r) => r.data),
  })

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: company,
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.put('/company', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      toast({ title: 'Configurações salvas!', description: 'Os dados da empresa foram atualizados.' })
    },
    onError: () => toast({ title: 'Erro ao salvar', variant: 'destructive' }),
  })

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações da Empresa</h1>
        <p className="text-sm text-slate-500">Dados que aparecem no cupom fiscal e nos documentos</p>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
        <Tabs defaultValue="empresa">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1.5 text-xs">
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* EMPRESA */}
          <TabsContent value="empresa">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle>Dados da Empresa</CardTitle><CardDescription>Razão social, nome fantasia e CNPJ</CardDescription></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome Fantasia" error={errors.tradeName?.message}><Input {...register('tradeName')} placeholder="Pizzaria do João" /></Field>
                <Field label="Razão Social" error={errors.companyName?.message}><Input {...register('companyName')} placeholder="João Silva ME" /></Field>
                <Field label="CNPJ" error={errors.cnpj?.message}><Input {...register('cnpj')} placeholder="00.000.000/0001-00" /></Field>
                <Field label="Inscrição Estadual" optional><Input {...register('stateRegistration')} placeholder="Opcional" /></Field>
                <div className="sm:col-span-2">
                  <Field label="Regime Tributário">
                    <Select onValueChange={(v) => setValue('taxRegime', v)} defaultValue={watch('taxRegime') || 'SIMPLES_NACIONAL'}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SIMPLES_NACIONAL">Simples Nacional</SelectItem>
                        <SelectItem value="LUCRO_PRESUMIDO">Lucro Presumido</SelectItem>
                        <SelectItem value="LUCRO_REAL">Lucro Real</SelectItem>
                        <SelectItem value="MEI">MEI</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ENDEREÇO */}
          <TabsContent value="endereco">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle>Endereço</CardTitle><CardDescription>Aparece no rodapé do cupom fiscal</CardDescription></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Field label="Logradouro" error={errors.street?.message}><Input {...register('street')} placeholder="Rua das Flores" /></Field></div>
                <Field label="Número"><Input {...register('number')} placeholder="123" /></Field>
                <Field label="Complemento" optional><Input {...register('complement')} placeholder="Sala 1" /></Field>
                <Field label="Bairro"><Input {...register('neighborhood')} placeholder="Centro" /></Field>
                <Field label="Cidade"><Input {...register('city')} placeholder="São Paulo" /></Field>
                <Field label="Estado"><Input {...register('state')} placeholder="SP" maxLength={2} className="uppercase" /></Field>
                <Field label="CEP"><Input {...register('zipCode')} placeholder="00000-000" /></Field>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONTATO */}
          <TabsContent value="contato">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle>Contato</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label="Telefone"><Input {...register('phone')} placeholder="(11) 99999-9999" /></Field>
                <Field label="Email"><Input {...register('email')} type="email" placeholder="contato@restaurante.com" /></Field>
                <div className="sm:col-span-2"><Field label="Website" optional><Input {...register('website')} placeholder="https://restaurante.com.br" /></Field></div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FISCAL */}
          <TabsContent value="fiscal">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle>Fiscal — SAT / NFC-e</CardTitle><CardDescription>Configurações de emissão de cupom fiscal eletrônico</CardDescription></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label="Número de Série SAT" optional><Input {...register('satSerialNumber')} placeholder="900004490" /></Field>
                <Field label="Código de Ativação SAT" optional><Input {...register('satActivationCode')} placeholder="12345678" /></Field>
                <Field label="CSC ID (NFC-e)" optional><Input {...register('nfceCscId')} placeholder="000001" /></Field>
                <Field label="CSC Token (NFC-e)" optional><Input {...register('nfceCscToken')} placeholder="Token do ambiente de produção" /></Field>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TEF */}
          <TabsContent value="tef">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle>TEF — Transferência Eletrônica de Fundos</CardTitle><CardDescription>Configuração do pinpad e gateway de pagamentos</CardDescription></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Provedor TEF">
                    <Select onValueChange={(v) => setValue('tefProvider', v)} defaultValue={watch('tefProvider') ?? ''}>
                      <SelectTrigger><SelectValue placeholder="Selecione o provedor" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SITEF">SiTEF (Software Express)</SelectItem>
                        <SelectItem value="REDE">Rede</SelectItem>
                        <SelectItem value="CIELO">Cielo</SelectItem>
                        <SelectItem value="STONE">Stone</SelectItem>
                        <SelectItem value="GETNET">Getnet</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Endereço IP do SiTEF"><Input {...register('tefIpAddress')} placeholder="192.168.1.100" /></Field>
                <Field label="Porta"><Input {...register('tefPort')} placeholder="4096" type="number" /></Field>
              </CardContent>
            </Card>
          </TabsContent>

          {/* APARÊNCIA */}
          <TabsContent value="aparencia">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle>Aparência</CardTitle><CardDescription>Personalize as cores do sistema para sua marca</CardDescription></CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cor Principal</Label>
                  <div className="flex items-center gap-3">
                    <input type="color" {...register('primaryColor')} defaultValue="#F97316" className="h-10 w-10 cursor-pointer rounded-lg border border-slate-200 p-0.5" />
                    <Input {...register('primaryColor')} placeholder="#F97316" className="font-mono" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor de Destaque</Label>
                  <div className="flex items-center gap-3">
                    <input type="color" {...register('accentColor')} defaultValue="#1E293B" className="h-10 w-10 cursor-pointer rounded-lg border border-slate-200 p-0.5" />
                    <Input {...register('accentColor')} placeholder="#1E293B" className="font-mono" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={mutation.isPending} size="lg" className="gap-2 text-white shadow-lg hover:opacity-90" style={{ background: 'linear-gradient(135deg, #22D3EE 0%, #3B82F6 50%, #8B5CF6 100%)', boxShadow: '0 8px 24px rgba(6,182,212,0.25)' }}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Salvo!' : 'Salvar Configurações'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children, error, optional }: { label: string; children: React.ReactNode; error?: string; optional?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        {label}
        {optional && <span className="text-xs font-normal text-slate-400">(opcional)</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
