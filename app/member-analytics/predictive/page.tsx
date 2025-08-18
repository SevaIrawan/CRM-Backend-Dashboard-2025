'use client'

import React, { useState } from 'react'
import Layout from '@/components/Layout'
import StandardPageTemplate from '@/components/StandardPageTemplate'

export default function PredictiveAnalytics() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  const handleLogout = () => {
    console.log('Logout clicked')
  }

  // KPI data untuk Predictive Analytics
  const predictiveAnalyticsKPIs = [
    {
      icon: '⚠️',
      title: 'CHURN RISK',
      value: 'Coming Soon',
      subtitle: 'Risk Score'
    },
    {
      icon: '📈',
      title: 'REVENUE FORECAST',
      value: 'Advanced',
      subtitle: 'Future Revenue'
    },
    {
      icon: '🎯',
      title: 'NEXT BEST ACTION',
      value: 'Smart',
      subtitle: 'Action Recommendations'
    },
    {
      icon: '📊',
      title: 'RISK DISTRIBUTION',
      value: 'Dynamic',
      subtitle: 'Risk Levels'
    }
  ]

  return (
    <Layout
      pageTitle="Predictive Analytics"
      darkMode={darkMode}
      sidebarExpanded={sidebarExpanded}
      onToggleDarkMode={() => setDarkMode(!darkMode)}
      onLogout={handleLogout}
    >
      <StandardPageTemplate 
        pageName="Predictive Analytics"
        kpiData={predictiveAnalyticsKPIs}
        showComingSoon={true}
      />
    </Layout>
  )
}
