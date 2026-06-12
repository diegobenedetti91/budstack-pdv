import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import axios from 'axios'

@Injectable()
export class FiscalService {
  constructor(private prisma: PrismaService) {}

  async emitNfce(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: { include: { product: true } }, payments: true },
    })

    if (!order) throw new BadRequestException('Pedido não encontrado')

    const company = await this.prisma.company.findUnique({ where: { tenantId } })
    if (!company) throw new BadRequestException('Empresa não configurada')

    // Validar configuração NFC-e
    if (!company.nfceSerialNumber || !company.nfceCscId || !company.nfceCscToken) {
      throw new BadRequestException('NFC-e não configurada. Configure em Configurações > Fiscal')
    }

    try {
      // Chamar API de emissão NFC-e (placeholder)
      const nfceData = await this.buildNfcePayload(company, order)
      const nfceResponse = await this.sendNfceToProvider(nfceData, company)

      // Salvar NFC-e na tabela Payment (relacionado ao primeiro pagamento)
      const payment = order.payments?.[0]
      if (payment) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            nfceKey: nfceResponse.key,
            receiptNumber: nfceResponse.number,
          },
        })
      }

      return {
        success: true,
        nfceKey: nfceResponse.key,
        nfceNumber: nfceResponse.number,
        url: nfceResponse.url,
      }
    } catch (error) {
      throw new BadRequestException(`Erro ao emitir NFC-e: ${error.message}`)
    }
  }

  async emitSat(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: { include: { product: true } }, payments: true },
    })

    if (!order) throw new BadRequestException('Pedido não encontrado')

    const company = await this.prisma.company.findUnique({ where: { tenantId } })
    if (!company) throw new BadRequestException('Empresa não configurada')

    // Validar configuração SAT
    if (!company.satSerialNumber || !company.satActivationCode) {
      throw new BadRequestException('SAT não configurado. Configure em Configurações > Fiscal')
    }

    try {
      // Integração SAT via SITEF (placeholder)
      const satData = this.buildSatPayload(company, order)
      const satResponse = await this.sendSatToDevice(satData, company)

      // Salvar SAT na tabela Payment
      const payment = order.payments?.[0]
      if (payment) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            receiptNumber: satResponse.cupom,
          },
        })
      }

      return {
        success: true,
        cupom: satResponse.cupom,
        chaveAcesso: satResponse.chaveAcesso,
        url: `https://sat.sefaz.rs.gov.br/consulta?chave=${satResponse.chaveAcesso}`,
      }
    } catch (error) {
      throw new BadRequestException(`Erro ao emitir SAT: ${error.message}`)
    }
  }

  private async buildNfcePayload(company: any, order: any) {
    return {
      cnpj: company.cnpj,
      serie: company.nfceSerialNumber || 1,
      numero: Math.floor(Math.random() * 1000000),
      dataEmissao: new Date().toISOString(),
      itens: order.items.map((item: any) => ({
        codigo: item.product.code || item.productId,
        descricao: item.product.name,
        valor: Number(item.totalPrice),
        quantidade: item.quantity,
      })),
      total: Number(order.total),
      consumidor: {
        nome: order.customerName || 'Consumidor',
        cpfCnpj: 'isento',
      },
    }
  }

  private buildSatPayload(company: any, order: any) {
    return {
      chave: `${Date.now()}`,
      itens: order.items.map((item: any) => ({
        descricao: item.product.name,
        valor: Number(item.totalPrice),
        quantidade: item.quantity,
      })),
      totalVenda: Number(order.total),
    }
  }

  private async sendNfceToProvider(payload: any, company: any) {
    // Chamar API externa (Pagar.me, Omie, etc)
    // Por enquanto, retorna response mock
    return {
      key: `35${company.cnpj}${Date.now()}`,
      number: Math.floor(Math.random() * 1000000),
      url: `https://nfe.sefaz.rs.gov.br/nfe/consulta?chave=...`,
    }
  }

  private async sendSatToDevice(payload: any, company: any) {
    // Integração com SAT-CF-e (SITEF ou Bematech)
    // Por enquanto, retorna response mock
    return {
      cupom: Math.floor(Math.random() * 1000000),
      chaveAcesso: `${Date.now()}`,
    }
  }

  async getReceiptUrl(nfceKey: string, company: any) {
    return `https://nfe.sefaz.rs.gov.br/nfe/consulta?chave=${nfceKey}`
  }
}
