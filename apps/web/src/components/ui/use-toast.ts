import { useState, useEffect, useCallback } from 'react'

type ToastVariant = 'default' | 'destructive'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  action?: React.ReactNode
}

const toastState: Toast[] = []
const listeners: Array<(toasts: Toast[]) => void> = []

function notifyListeners() {
  listeners.forEach((listener) => listener([...toastState]))
}

export function toast({ title, description, variant = 'default', action }: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  toastState.push({ id, title, description, variant, action })
  notifyListeners()
  setTimeout(() => {
    const idx = toastState.findIndex((t) => t.id === id)
    if (idx > -1) { toastState.splice(idx, 1); notifyListeners() }
  }, 5000)
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([...toastState])

  useEffect(() => {
    listeners.push(setToasts)
    return () => { const idx = listeners.indexOf(setToasts); if (idx > -1) listeners.splice(idx, 1) }
  }, [])

  const dismiss = useCallback((id: string) => {
    const idx = toastState.findIndex((t) => t.id === id)
    if (idx > -1) { toastState.splice(idx, 1); notifyListeners() }
  }, [])

  return { toasts, toast, dismiss }
}
