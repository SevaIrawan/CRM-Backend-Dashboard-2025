'use client'

import { useState, useCallback } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import SubHeader from './SubHeader'
import AccessControl from './AccessControl'
import PageTransition from './PageTransition'
import NavPrefetch from './NavPrefetch'
import ActivityTracker from './ActivityTracker'
import FeedbackWidget from './FeedbackWidget'

interface LayoutProps {
  children: React.ReactNode
  pageTitle?: string
  subtitle?: string
  subHeaderTitle?: string
  customSubHeader?: React.ReactNode
  darkMode?: boolean
  onToggleDarkMode?: () => void
  onLogout?: () => void
  sidebarExpanded?: boolean
}

export default function Layout({ 
  children, 
  pageTitle, // Remove default value to allow Header to handle dynamic titles
  subHeaderTitle,
  customSubHeader,
  darkMode = false,
  onToggleDarkMode = () => {},
  onLogout = () => {},
  sidebarExpanded = true
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(sidebarExpanded)

  // ✅ OPTIMIZED: Memoize setSidebarOpen to prevent unnecessary re-renders
  const handleSetSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpen(open)
  }, [])

  return (
    <ActivityTracker>
      <AccessControl>
        <div className="main-container">
          <NavPrefetch />
          
          <Sidebar 
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={handleSetSidebarOpen}
            darkMode={darkMode}
            onToggleDarkMode={onToggleDarkMode}
            onLogout={onLogout}
            sidebarExpanded={sidebarExpanded}
          />
          
          <Header 
            pageTitle={pageTitle}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={handleSetSidebarOpen}
            darkMode={darkMode}
            onToggleDarkMode={onToggleDarkMode}
            onLogout={onLogout}
          />
          
          {customSubHeader && (
            <div className="subheader">
              {customSubHeader}
            </div>
          )}
          
          <div className={`main-content ${!sidebarOpen ? 'collapsed' : ''} ${customSubHeader ? 'has-subheader' : ''}`}>
            <PageTransition>
              {children}
            </PageTransition>
          </div>
          
          {/* Feedback Widget - Available on all pages */}
          <FeedbackWidget />
        </div>
      </AccessControl>
    </ActivityTracker>
  )
} 