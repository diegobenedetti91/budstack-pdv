import { Injectable, Logger } from '@nestjs/common'
import * as net from 'net'
import { PrismaService } from '../prisma/prisma.service'
import { PrinterDestination, PrinterType } from '@budstack/types'

interface KitchenTicket {
  orderNumber: number
  tableNumber?: number | null
  customerName?: string | null
  productName: string
  quantity: number
  notes?: string | null
  sentAt: Date
}

@Injectable()
export class PrintService {
  private readonly logger = new Logger(PrintService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Busca impressoras de cozinha ativas do tenant e imprime o ticket.
   * Falhas de impressão são logadas mas nunca bloqueiam o fluxo do pedido.
   */
  async printKitchenTicket(tenantId: string, ticket: KitchenTicket): Promise<void> {
    const printers = await this.prisma.printer.findMany({
      where: {
        tenantId,
        isActive: true,
        destination: { in: [PrinterDestination.KITCHEN, PrinterDestination.BOTH] },
        type: PrinterType.NETWORK,
        ipAddress: { not: null },
      },
    })

    if (printers.length === 0) return

    const buffer = this.buildKitchenBuffer(ticket)

    await Promise.allSettled(
      printers.map((p) =>
        this.sendTcp(p.ipAddress!, p.port ?? 9100, buffer).catch((err) => {
          this.logger.warn(`Impressora "${p.name}" (${p.ipAddress}:${p.port}) — ${err.message}`)
        }),
      ),
    )
  }

  // ── ESC/POS builder ────────────────────────────────────────────────────────

  private buildKitchenBuffer(ticket: KitchenTicket): Buffer {
    const b: number[] = []

    const push  = (...bytes: number[]) => b.push(...bytes)
    const text  = (s: string) => b.push(...Array.from(Buffer.from(s, 'latin1')))
    const line  = (s = '') => text(s + '\n')
    const sep   = () => line('--------------------------------')

    // Inicializa impressora
    push(0x1b, 0x40)            // ESC @ — reset
    push(0x1b, 0x61, 0x01)     // ESC a 1 — alinha centro

    // Número da comanda em tamanho duplo + negrito
    push(0x1b, 0x21, 0x30)     // double height+width + bold
    line(`COMANDA #${ticket.orderNumber}`)
    push(0x1b, 0x21, 0x00)     // normal

    // Mesa ou cliente
    push(0x1b, 0x21, 0x08)     // bold
    const destination = ticket.tableNumber
      ? `Mesa ${ticket.tableNumber}`
      : (ticket.customerName ?? 'Balcão / Retirada')
    line(destination)
    push(0x1b, 0x21, 0x00)

    // Horário
    const time = ticket.sentAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    line(time)

    push(0x1b, 0x61, 0x00)     // alinha esquerda
    sep()

    // Produto em tamanho duplo
    push(0x1b, 0x21, 0x10)     // double height
    line(`${ticket.quantity}x ${ticket.productName}`)
    push(0x1b, 0x21, 0x00)

    // Observação
    if (ticket.notes?.trim()) {
      push(0x1b, 0x21, 0x00)
      text('OBS: ')
      push(0x1b, 0x21, 0x08)   // bold
      line(ticket.notes.trim())
      push(0x1b, 0x21, 0x00)
    }

    sep()

    // Avança papel e corta
    push(0x1b, 0x64, 0x05)     // ESC d 5 — avança 5 linhas
    push(0x1d, 0x56, 0x00)     // GS V 0 — corte total

    return Buffer.from(b)
  }

  // ── TCP sender ─────────────────────────────────────────────────────────────

  private sendTcp(ip: string, port: number, data: Buffer, timeoutMs = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket()

      const timer = setTimeout(() => {
        socket.destroy()
        reject(new Error(`timeout após ${timeoutMs}ms`))
      }, timeoutMs)

      socket.connect(port, ip, () => {
        socket.write(data, (err) => {
          clearTimeout(timer)
          socket.end()
          if (err) reject(err)
          else resolve()
        })
      })

      socket.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })
  }
}
