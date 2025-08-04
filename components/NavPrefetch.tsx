'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Component untuk prefetch pages yang sering diakses
export default function NavPrefetch() {
  const router = useRouter()

  useEffect(() => {
    // Prefetch common routes untuk smooth navigation
    const commonRoutes = [
      '/dashboard',
      '/business-flow', 
      '/strategic-executive',
      '/usc/overview',
      '/usc/sales',
      '/bgo',
      '/sr',
      '/xoo',
      '/os',
      '/users',
      '/supabase'
    ]

    // Prefetch dengan delay untuk tidak mengganggu initial load
    const prefetchTimer = setTimeout(() => {
      commonRoutes.forEach((route, index) => {
        setTimeout(() => {
          router.prefetch(route)
        }, index * 50) // Stagger prefetch calls
      })
    }, 2000) // Wait 2 seconds after mount

    return () => clearTimeout(prefetchTimer)
  }, [router])

  // Component ini tidak render apa-apa, hanya untuk prefetching
  return null
}

// Hook untuk manual prefetch
export const usePrefetch = () => {
  const router = useRouter()

  const prefetchRoute = (path: string) => {
    if (typeof window !== 'undefined') {
      router.prefetch(path)
    }
  }

  return { prefetchRoute }
}