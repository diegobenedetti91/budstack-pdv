import { create } from 'zustand'

export interface WaiterNotification {
  id: string
  type: 'item_ready' | 'bill_requested'
  orderId: string
  orderNumber: number
  itemId: string
  itemName: string
  tableNumber: number | null
  tableId: string | null
  receivedAt: Date
  read: boolean
}

interface NotificationState {
  notifications: WaiterNotification[]
  add: (n: Omit<WaiterNotification, 'id' | 'receivedAt' | 'read'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  add: (n) =>
    set((s) => ({
      notifications: [
        { ...n, id: `${n.itemId}-${Date.now()}`, receivedAt: new Date(), read: false },
        ...s.notifications,
      ].slice(0, 50),
    })),
  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
}))
