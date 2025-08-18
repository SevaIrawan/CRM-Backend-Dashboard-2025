'use client'

import React, { useState } from 'react'
import Layout from '@/components/Layout'
import StandardPageTemplate from '@/components/StandardPageTemplate'

export default function SegmentationAnalysis() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  const handleLogout = () => {
    console.log('Logout clicked')
  }

  // KPI data untuk Segmentation Analysis
  const segmentationAnalysisKPIs = [
    {
      icon: '🏆',
      title: 'VIP MEMBERS',
      value: 'Coming Soon',
      subtitle: 'High Value Members'
    },
    {
      icon: '🌍',
      title: 'GEOGRAPHIC DIST',
      value: 'Advanced',
      subtitle: 'Location Analysis'
    },
    {
      icon: '👥',
      title: 'AGE GROUPS',
      value: 'Smart',
      subtitle: 'Demographic Data'
    },
    {
      icon: '🎯',
      title: 'ACTIVITY LEVEL',
      value: 'Dynamic',
      subtitle: 'Engagement Segments'
    }
  ]

  return (
    <Layout
      pageTitle="Segmentation Analysis"
      darkMode={darkMode}
      sidebarExpanded={sidebarExpanded}
      onToggleDarkMode={() => setDarkMode(!darkMode)}
      onLogout={handleLogout}
    >
      <StandardPageTemplate 
        pageName="Segmentation Analysis"
        kpiData={segmentationAnalysisKPIs}
        showComingSoon={true}
      />
    </Layout>
  )
}
