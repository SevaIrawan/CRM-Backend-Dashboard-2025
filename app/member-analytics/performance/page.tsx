'use client'

import React, { useState } from 'react'
import Layout from '@/components/Layout'
import StandardPageTemplate from '@/components/StandardPageTemplate'

export default function PerformanceMetrics() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  const handleLogout = () => {
    console.log('Logout clicked')
  }

  // KPI data untuk Performance Metrics
  const performanceMetricsKPIs = [
    {
      icon: '💰',
      title: 'CUSTOMER LTV',
      value: 'Coming Soon',
      subtitle: 'Lifetime Value'
    },
    {
      icon: '📈',
      title: 'REVENUE GROWTH',
      value: 'Advanced',
      subtitle: 'Growth Rate'
    },
    {
      icon: '🎯',
      title: 'WIN/LOSS RATIO',
      value: 'Smart',
      subtitle: 'Performance Ratio'
    },
    {
      icon: '📊',
      title: 'VALUE DISTRIBUTION',
      value: 'Dynamic',
      subtitle: 'Value Segments'
    }
  ]

  return (
    <Layout
      pageTitle="Performance Metrics"
      darkMode={darkMode}
      sidebarExpanded={sidebarExpanded}
      onToggleDarkMode={() => setDarkMode(!darkMode)}
      onLogout={handleLogout}
    >
      <StandardPageTemplate 
        pageName="Performance Metrics"
        kpiData={performanceMetricsKPIs}
        showComingSoon={true}
      />
    </Layout>
  )
}
