'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, UtensilsCrossed, ShoppingBag, ChefHat, CreditCard,
  Settings, Users, BookOpen, Printer, LogOut, ChevronLeft, ChevronRight, Monitor,
  BarChart3, DollarSign, Bell,
} from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/lib/api'

type NavItem = {
  href: string
  icon: React.ElementType
  label: string
  badge?: string
  roles?: string[]
}

const navItems: NavItem[] = [
  { href: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard',        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'] },
  { href: '/mesas',           icon: UtensilsCrossed, label: 'Mesas',            roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'WAITER'] },
  { href: '/pedidos',         icon: ShoppingBag,     label: 'Pedidos',          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER'] },
  { href: '/cozinha',         icon: ChefHat,         label: 'Cozinha',          badge: 'KDS', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'KITCHEN'] },
  { href: '/notificacoes',    icon: Bell,            label: 'Pedidos Prontos',  roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'WAITER', 'KITCHEN'] },
  { href: '/pdv',             icon: CreditCard,      label: 'PDV / Caixa',     roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'] },
  { href: '/turno',           icon: DollarSign,      label: 'Turno de Caixa',  roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'] },
  { href: '/cardapio',        icon: BookOpen,        label: 'Cardápio',         roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
  { href: '/relatorios',      icon: BarChart3,       label: 'Relatórios',       roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'] },
  { href: '/autoatendimento', icon: Monitor,         label: 'Autoatendimento',  roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
  { href: '/usuarios',        icon: Users,           label: 'Usuários',         roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/impressoras',     icon: Printer,         label: 'Impressoras',      roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/configuracoes',   icon: Settings,        label: 'Configurações',    roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  const visibleItems = navItems.filter(
    (item) => !item.roles || !user?.role || item.roles.includes(user.role),
  )

  const { data: readyCount = 0 } = useQuery({
    queryKey: ['sidebar-ready-count'],
    queryFn: async () => {
      const r = await api.get('/orders?status=OPEN,IN_PROGRESS')
      const orders: any[] = r.data ?? []
      return orders.flatMap((o) => (o.items ?? []).filter((i: any) => i.status === 'READY')).length
    },
    refetchInterval: 3000,
  })

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 240 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      className="relative flex h-full flex-col overflow-hidden border-r border-slate-200/80 bg-white dark:border-white/[0.06] dark:bg-[#0d0d10]"
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className={cn(
        'flex h-14 shrink-0 items-center border-b border-slate-100 dark:border-white/[0.05]',
        collapsed ? 'justify-center px-3' : 'gap-3 px-4',
      )}>
        {/* Brand gradient logo mark */}
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl brand-gradient shadow-lg shadow-cyan-500/20">
          <ChefHat className="h-4 w-4 text-white" />
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <span className="whitespace-nowrap text-sm font-bold">
                <span className="brand-gradient-text">Bud</span>
                <span className="text-slate-900 dark:text-white">stack</span>
                <span className="ml-1 text-[10px] font-medium text-slate-400 dark:text-white/30">PDV</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden p-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const hasReadyBadge = item.href === '/notificacoes' && readyCount > 0
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'group relative flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  collapsed ? 'justify-center px-2' : 'gap-3',
                  isActive
                    ? 'bg-cyan-500/[0.08] text-cyan-600 dark:bg-cyan-500/[0.10] dark:text-cyan-400'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-white/40 dark:hover:bg-white/[0.05] dark:hover:text-white/75',
                )}
              >
                {/* Active indicator — gradient bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full brand-gradient" />
                )}

                <item.icon className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive
                    ? 'text-cyan-500'
                    : 'text-slate-400 group-hover:text-slate-600 dark:text-white/30 dark:group-hover:text-white/65',
                )} />

                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-1 items-center justify-between overflow-hidden"
                    >
                      <span className="whitespace-nowrap">{item.label}</span>
                      <div className="flex items-center gap-1.5">
                        {item.badge && (
                          <span className="rounded-md bg-cyan-50 px-1.5 py-0.5 text-[10px] font-bold text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400">
                            {item.badge}
                          </span>
                        )}
                        {hasReadyBadge && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm shadow-red-500/40">
                            {readyCount > 99 ? '99+' : readyCount}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Collapsed badge */}
                {collapsed && hasReadyBadge && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm">
                    {readyCount > 9 ? '9+' : readyCount}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* ── User + Logout ─────────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 p-2 dark:border-white/[0.05]">
        {!collapsed && user && (
          <div className="mb-1 flex items-center gap-2.5 rounded-xl px-3 py-2">
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg brand-gradient text-[11px] font-bold text-white shadow-sm shadow-cyan-500/25">
              {user.name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800 dark:text-white/75">{user.name}</p>
              <p className="truncate text-[10px] text-slate-400 dark:text-white/25">{user.role}</p>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className={cn(
            'flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
            'text-slate-500 hover:bg-red-50 hover:text-red-600',
            'dark:text-white/25 dark:hover:bg-red-500/[0.08] dark:hover:text-red-400',
            collapsed ? 'justify-center px-2' : 'gap-3',
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap"
              >
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* ── Collapse toggle ──────────────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-cyan-300 hover:text-cyan-500 dark:border-white/[0.10] dark:bg-[#1a1a20] dark:text-white/25 dark:hover:border-cyan-500/40 dark:hover:text-cyan-400"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </motion.aside>
  )
}
