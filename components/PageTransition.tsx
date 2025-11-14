'use client'

interface PageTransitionProps {
  children: React.ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  // Direct render - no state, no delay, no flicker
  return <>{children}</>
}