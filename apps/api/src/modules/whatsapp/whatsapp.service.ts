import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name)

  constructor(private config: ConfigService) {}

  private get provider() { return this.config.get('WHATSAPP_PROVIDER') ?? 'evolution' }
  private get apiUrl() { return this.config.get('WHATSAPP_API_URL') }
  private get apiToken() { return this.config.get('WHATSAPP_API_TOKEN') }
  private get instance() { return this.config.get('WHATSAPP_INSTANCE') ?? 'budstack' }

  private isConfigured(): boolean {
    return !!(this.apiUrl && this.apiToken)
  }

  // Normaliza para formato internacional: remove -, (, ), espaços, adiciona 55 se necessário
  private formatPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('55') && digits.length >= 12) return digits
    return `55${digits}`
  }

  async sendReadyNotification(
    phone: string,
    customerName: string,
    orderNumber: number,
  ): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn('WhatsApp não configurado — WHATSAPP_API_URL e WHATSAPP_API_TOKEN são obrigatórios')
      return
    }

    const to = this.formatPhone(phone)
    const message =
      `Olá ${customerName}! 👋\n` +
      `Seu pedido *#${orderNumber}* está pronto para retirada! 🎉\n` +
      `Por favor, dirija-se ao balcão para buscar. 🍽️`

    try {
      if (this.provider === 'zapi') {
        await this.sendZApi(to, message)
      } else {
        await this.sendEvolution(to, message)
      }
      this.logger.log(`WhatsApp enviado para ${to} — pedido #${orderNumber}`)
    } catch (err: any) {
      // Não deixa falhar o request principal
      this.logger.error(`Falha ao enviar WhatsApp para ${to}: ${err?.message}`)
    }
  }

  // Evolution API (open source, self-hosted)
  // Docs: https://doc.evolution-api.com
  private async sendEvolution(to: string, message: string): Promise<void> {
    const url = `${this.apiUrl}/message/sendText/${this.instance}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: this.apiToken! },
      body: JSON.stringify({
        number: to,
        options: { delay: 1200, presence: 'composing' },
        textMessage: { text: message },
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Evolution API ${res.status}: ${body}`)
    }
  }

  // Z-API (cloud service)
  // Docs: https://developer.z-api.io
  private async sendZApi(to: string, message: string): Promise<void> {
    const url = `${this.apiUrl}/send-text`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': this.apiToken!,
      },
      body: JSON.stringify({ phone: to, message }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Z-API ${res.status}: ${body}`)
    }
  }
}
