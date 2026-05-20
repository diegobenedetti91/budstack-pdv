'use client'

import { WifiOff, Sun, Moon } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useState, useEffect } from 'react'
import { WaiterBell } from './waiter-bell'

export function Header() {
  const isOnline = useOnlineStatus()
  const user = useAuthStore((s) => s.user)
  const [dark, setDark] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white px-5 dark:border-white/[0.05] dark:bg-[#0d0d10]">
      {/* Connection status */}
      <div className="flex items-center gap-2">
        {isOnline ? (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-1 dark:ring-emerald-500/20">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Online
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-400 dark:ring-1 dark:ring-red-500/20">
            <WifiOff className="h-3 w-3" />
            Offline
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-white/35 dark:hover:bg-white/[0.05] dark:hover:text-white/65"
          onClick={() => setDark(!dark)}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <WaiterBell />

        <div className="ml-1 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-white/[0.07] dark:bg-white/[0.04]">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="brand-gradient text-[10px] font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          {user?.name && (
            <span className="hidden text-xs font-medium text-slate-700 sm:block dark:text-white/65">
              {user.name.split(' ')[0]}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
