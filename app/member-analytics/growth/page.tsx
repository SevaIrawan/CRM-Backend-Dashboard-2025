'use client'

import React, { useState } from 'react'
import Layout from '@/components/Layout'
import StandardPageTemplate from '@/components/StandardPageTemplate'

export default function GrowthAnalysis() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  const handleLogout = () => {
    console.log('Logout clicked')
  }

  // KPI data untuk Growth Analysis
  const growthAnalysisKPIs = [
    {
      icon: '🆕',
      title: 'NEW MEMBERS',
      value: 'Coming Soon',
      subtitle: 'Acquisition Rate'
    },
    {
      icon: '🔄',
      title: 'RETENTION RATE',
      value: 'Advanced',
      subtitle: 'Monthly Retention'
    },
    {
      icon: '📊',
      title: 'COHORT ANALYSIS',
      value: 'Smart',
      subtitle: 'Cohort Performance'
    },
    {
      icon: '🎯',
      title: 'CONVERSION RATE',
      value: 'Dynamic',
      subtitle: 'Conversion Metrics'
    }
  ]

  return (
    <Layout
      pageTitle="Growth Analysis"
      darkMode={darkMode}
      sidebarExpanded={sidebarExpanded}
      onToggleDarkMode={() => setDarkMode(!darkMode)}
      onLogout={handleLogout}
    >
      <StandardPageTemplate 
        pageName="Growth Analysis"
        kpiData={growthAnalysisKPIs}
        showComingSoon={true}
      />
    </Layout>
  )
}
