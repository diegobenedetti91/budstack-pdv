'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MesaPage({
  params,
}: {
  params: { slug: string; tableId: string }
}) {
  const router = useRouter()

  useEffect(() => {
    router.push(`/kiosk/${params.slug}?table=${params.tableId}`)
  }, [params, router])

  return (
    <div className="flex h-screen items-center justify-center bg-[#09090e]">
      <div className="text-white">Carregando...</div>
    </div>
  )
}
