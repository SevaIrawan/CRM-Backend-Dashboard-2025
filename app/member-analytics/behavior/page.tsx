'use client'

import React, { useState } from 'react'
import Layout from '@/components/Layout'
import StandardPageTemplate from '@/components/StandardPageTemplate'

export default function BehaviorAnalysis() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  const handleLogout = () => {
    console.log('Logout clicked')
  }

  // KPI data untuk Behavior Analysis
  const behaviorAnalysisKPIs = [
    {
      icon: '⏱️',
      title: 'SESSION DURATION',
      value: 'Coming Soon',
      subtitle: 'Average Time'
    },
    {
      icon: '🔄',
      title: 'PURCHASE FREQUENCY',
      value: 'Advanced',
      subtitle: 'Transaction Rate'
    },
    {
      icon: '💰',
      title: 'AVG TRANSACTION',
      value: 'Smart',
      subtitle: 'Transaction Value'
    },
    {
      icon: '🎮',
      title: 'GAMING PREFERENCES',
      value: 'Dynamic',
      subtitle: 'Game Categories'
    }
  ]

  return (
    <Layout
      pageTitle="Behavior Analysis"
      darkMode={darkMode}
      sidebarExpanded={sidebarExpanded}
      onToggleDarkMode={() => setDarkMode(!darkMode)}
      onLogout={handleLogout}
    >
      <StandardPageTemplate 
        pageName="Behavior Analysis"
        kpiData={behaviorAnalysisKPIs}
        showComingSoon={true}
      />
    </Layout>
  )
}
