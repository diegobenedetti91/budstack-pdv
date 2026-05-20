'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Check, Loader2, Printer, Wifi, Usb, Bluetooth, Star } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { PrinterType, PrinterDestination } from '@budstack/types'

interface PrinterEntity {
  id: string; name: string; type: PrinterType; destination: PrinterDestination
  ipAddress?: string; port?: number; usbPath?: string; isActive: boolean; isDefault: boolean
}

const typeConfig: Record<PrinterType, { label: string; icon: typeof Wifi }> = {
  NETWORK: { label: 'Rede (TCP/IP)', icon: Wifi },
  USB: { label: 'USB', icon: Usb },
  BLUETOOTH: { label: 'Bluetooth', icon: Bluetooth },
}

const destConfig: Record<PrinterDestination, { label: string; color: string }> = {
  KITCHEN: { label: 'Cozinha', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  BAR: { label: 'Bar', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  CASHIER: { label: 'Caixa', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  BOTH: { label: 'Cozinha + Bar', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
}

const printerSchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  type: z.nativeEnum(PrinterType),
  destination: z.nativeEnum(PrinterDestination),
  ipAddress: z.string().optional(),
  port: z.coerce.number().optional(),
  usbPath: z.string().optional(),
  isDefault: z.boolean().optional(),
})
type PrinterForm = z.infer<typeof printerSchema>

function PrinterModal({ onClose, editing }: { onClose: () => void; editing?: PrinterEntity }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<PrinterForm>({
    resolver: zodResolver(printerSchema),
    defaultValues: editing ?? { type: PrinterType.NETWORK, destination: PrinterDestination.KITCHEN, port: 9100 },
  })

  const type = watch('type')

  const save = async (data: PrinterForm) => {
    try {
      if (editing) await api.patch(`/printers/${editing.id}`, data)
      else await api.post('/printers', data)
      qc.invalidateQueries({ queryKey: ['printers'] })
      toast({ title: editing ? 'Impressora atualizada!' : 'Impressora cadastrada!' })
      onClose()
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">{editing ? 'Editar Impressora' : 'Nova Impressora'}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit(save)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da impressora</Label>
            <Input {...register('name')} placeholder="Ex: Impressora Cozinha 1" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo de conexão</Label>
              <Select onValueChange={(v) => setValue('type', v as PrinterType)} defaultValue={watch('type')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeConfig).map(([k, c]) => (
                    <SelectItem key={k} value={k}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Destino dos pedidos</Label>
              <Select onValueChange={(v) => setValue('destination', v as PrinterDestination)} defaultValue={watch('destination')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(destConfig).map(([k, c]) => (
                    <SelectItem key={k} value={k}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === PrinterType.NETWORK && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Endereço IP</Label>
                <Input {...register('ipAddress')} placeholder="192.168.1.100" />
              </div>
              <div className="space-y-1.5">
                <Label>Porta</Label>
                <Input {...register('port')} type="number" placeholder="9100" />
              </div>
            </div>
          )}

          {type === PrinterType.USB && (
            <div className="space-y-1.5">
              <Label>Caminho USB</Label>
              <Input {...register('usbPath')} placeholder="/dev/usb/lp0 ou COM3" />
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <input type="checkbox" id="isDefault" {...register('isDefault')} className="h-4 w-4 rounded accent-cyan-500" />
            <label htmlFor="isDefault" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Definir como impressora padrão
            </label>
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

export default function ImpressorasPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ open: boolean; editing?: PrinterEntity }>({ open: false })

  const { data: printers = [], isLoading } = useQuery<PrinterEntity[]>({
    queryKey: ['printers'],
    queryFn: () => api.get('/printers').then((r) => r.data),
  })

  const deletePrinter = useMutation({
    mutationFn: (id: string) => api.delete(`/printers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['printers'] }); toast({ title: 'Impressora removida' }) },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Impressoras</h1>
          <p className="text-sm text-slate-500">Impressoras térmicas ESC/POS cadastradas</p>
        </div>
        <Button onClick={() => setModal({ open: true })} className="gap-2 bg-cyan-500 hover:bg-cyan-600 shadow-sm shadow-cyan-500/25">
          <Plus className="h-4 w-4" /> Adicionar Impressora
        </Button>
      </div>

      {/* Info card */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-300">
        <p className="font-semibold mb-1">Como funciona a impressão</p>
        <p className="text-blue-600 dark:text-blue-400">Ao criar um pedido, os itens são enviados automaticamente para a impressora configurada. Quando o sistema estiver <strong>offline</strong>, os jobs ficam em fila local e imprimem assim que a conexão for restabelecida.</p>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-cyan-500" /></div>
      ) : printers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-slate-300 dark:border-slate-700">
          <Printer className="mb-3 h-12 w-12" />
          <p className="text-slate-400 font-medium">Nenhuma impressora cadastrada</p>
          <p className="text-sm">Adicione uma impressora ESC/POS para imprimir comandas</p>
          <Button onClick={() => setModal({ open: true })} className="mt-4 gap-2 bg-cyan-500 hover:bg-cyan-600">
            <Plus className="h-4 w-4" /> Adicionar Impressora
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {printers.map((printer, i) => {
            const type = typeConfig[printer.type]
            const dest = destConfig[printer.destination]
            return (
              <motion.div
                key={printer.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
                className={cn(
                  'group relative rounded-2xl border p-5 transition-shadow hover:shadow-md',
                  printer.isActive
                    ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                    : 'border-slate-100 bg-slate-50 opacity-60 dark:border-slate-800/50 dark:bg-slate-900/50',
                )}
              >
                {printer.isDefault && (
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
                    <Star className="h-2.5 w-2.5 fill-current" /> Padrão
                  </div>
                )}

                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <type.icon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{printer.name}</p>
                    <p className="text-xs text-slate-500">{type.label}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {printer.ipAddress && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">IP</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{printer.ipAddress}:{printer.port}</span>
                    </div>
                  )}
                  {printer.usbPath && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Caminho</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{printer.usbPath}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Destino</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', dest.color)}>{dest.label}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => setModal({ open: true, editing: printer })}>
                    <Edit2 className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" onClick={() => deletePrinter.mutate(printer.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {modal.open && <PrinterModal onClose={() => setModal({ open: false })} editing={modal.editing} />}
      </AnimatePresence>
    </div>
  )
}
