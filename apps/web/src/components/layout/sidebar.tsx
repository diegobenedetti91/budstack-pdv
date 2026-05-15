'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, UtensilsCrossed, ShoppingBag, ChefHat, CreditCard,
  Settings, Users, BookOpen, Printer, LogOut, ChevronLeft, ChevronRight, Monitor,
  BarChart3, DollarSign,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/mesas', icon: UtensilsCrossed, label: 'Mesas' },
  { href: '/pedidos', icon: ShoppingBag, label: 'Pedidos' },
  { href: '/cozinha', icon: ChefHat, label: 'Cozinha', badge: 'KDS' },
  { href: '/pdv', icon: CreditCard, label: 'PDV / Caixa' },
  { href: '/turno', icon: DollarSign, label: 'Turno de Caixa' },
  { href: '/cardapio', icon: BookOpen, label: 'Cardápio' },
  { href: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { href: '/autoatendimento', icon: Monitor, label: 'Autoatendimento' },
  { href: '/usuarios', icon: Users, label: 'Usuários' },
  { href: '/impressoras', icon: Printer, label: 'Impressoras' },
  { href: '/configuracoes', icon: Settings, label: 'Configurações' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const logout = useAuthStore((s) => s.logout)

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative flex h-full flex-col border-r border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      {/* Logo */}
      <div className={cn('flex h-16 items-center border-b border-slate-100 dark:border-slate-800 px-4', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500 shadow-sm">
          <ChefHat className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold text-slate-900 dark:text-white">
            BudStack PDV
          </motion.span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: collapsed ? 0 : 2 }}
                className={cn(
                  'mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50',
                  collapsed && 'justify-center px-2',
                )}
              >
                <item.icon className={cn('h-4 w-4 shrink-0', isActive && 'text-orange-500')} />
                {!collapsed && (
                  <span className="flex-1">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                    {item.badge}
                  </span>
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-100 p-2 dark:border-slate-800">
        <button
          onClick={logout}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400',
            collapsed && 'justify-center px-2',
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-orange-200 hover:text-orange-500 dark:border-slate-700 dark:bg-slate-900"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </motion.aside>
  )
}
