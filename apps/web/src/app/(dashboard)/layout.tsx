import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#09090e]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="relative flex-1 overflow-y-auto p-6">
          {/* Ambient gradient overlay — brand colors, dark mode only */}
          <div
            className="pointer-events-none absolute inset-0 hidden dark:block"
            style={{
              background:
                'radial-gradient(ellipse 80% 280px at 50% 0, rgba(6,182,212,0.05) 0%, transparent 55%), ' +
                'radial-gradient(ellipse 40% 200px at 90% 100%, rgba(139,92,246,0.04) 0%, transparent 50%)',
            }}
          />
          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  )
}
