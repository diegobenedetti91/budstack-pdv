export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#09090e]">
      {children}
    </div>
  )
}
