import Dexie, { type Table } from 'dexie'

export interface OfflineOrder {
  id: string
  tenantId: string
  tableId?: string
  items: any[]
  status: string
  createdAt: number
  synced: boolean
}

export interface OfflineProduct {
  id: string
  tenantId: string
  name: string
  price: number
  categoryId: string
  isAvailable: boolean
  updatedAt: number
}

export interface OfflinePrintJob {
  id: string
  content: string
  destination: string
  orderId?: string
  createdAt: number
  printed: boolean
}

class BudStackDB extends Dexie {
  orders!: Table<OfflineOrder>
  products!: Table<OfflineProduct>
  printJobs!: Table<OfflinePrintJob>

  constructor() {
    super('budstack-offline')
    this.version(1).stores({
      orders: 'id, tenantId, status, synced, createdAt',
      products: 'id, tenantId, categoryId',
      printJobs: 'id, printed, createdAt',
    })
  }
}

export const offlineDb = new BudStackDB()

export async function syncOfflineOrders(apiPost: (path: string, data: any) => Promise<any>) {
  const unsynced = await offlineDb.orders.where('synced').equals(0).toArray()
  for (const order of unsynced) {
    try {
      await apiPost('/orders', order)
      await offlineDb.orders.update(order.id, { synced: true })
    } catch {
      // será tentado novamente na próxima sincronização
    }
  }
}
