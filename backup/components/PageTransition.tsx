'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

interface PageTransitionProps {
  children: React.ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [displayChildren, setDisplayChildren] = useState(children)
  const pathname = usePathname()
  const previousPathname = useRef(pathname)

  useEffect(() => {
    // Only show loading if pathname actually changed
    if (pathname !== previousPathname.current) {
      setIsLoading(true)
      
      // Small delay to show loading state, then update content
      const timer = setTimeout(() => {
        setDisplayChildren(children)
        setIsLoading(false)
        previousPathname.current = pathname
      }, 150) // Short delay for smooth transition

      return () => clearTimeout(timer)
    } else {
      setDisplayChildren(children)
    }
  }, [pathname, children])

  if (isLoading) {
    return (
      <div className="page-transition-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
        
        <style jsx>{`
          .page-transition-loading {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(248, 249, 250, 0.95);
            backdrop-filter: blur(2px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: fadeIn 0.15s ease-in;
          }
          
          .loading-content {
            text-align: center;
            padding: 24px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            min-width: 200px;
          }
          
          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #e5e7eb;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 16px;
          }
          
          p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
            font-weight: 500;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="page-transition-content">
      {displayChildren}
      
      <style jsx>{`
        .page-transition-content {
          animation: fadeInContent 0.3s ease-out;
        }
        
        @keyframes fadeInContent {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}