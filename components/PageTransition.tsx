'use client'

interface PageTransitionProps {
  children: React.ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  // ✅ Direct render - no loading state here
  // Let each page component handle its own loading with StandardLoadingSpinner
  // This ensures only ONE loading spinner per page (from page component itself)
  return <>{children}</>
}
