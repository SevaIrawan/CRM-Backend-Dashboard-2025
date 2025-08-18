'use client'

import React, { useState } from 'react'
import Layout from '@/components/Layout'
import StandardPageTemplate from '@/components/StandardPageTemplate'

export default function MemberAnalytics() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  const handleLogout = () => {
    console.log('Logout clicked')
  }

  // KPI data untuk Member Analytics
  const memberAnalyticsKPIs = [
    {
      icon: '👥',
      title: 'TOTAL MEMBERS',
      value: 'Coming Soon',
      subtitle: 'Real-time Count'
    },
    {
      icon: '📈',
      title: 'GROWTH RATE',
      value: 'Advanced',
      subtitle: 'Monthly Trends'
    },
    {
      icon: '💰',
      title: 'REVENUE/MEMBER',
      value: 'Smart',
      subtitle: 'Average Value'
    },
    {
      icon: '⚠️',
      title: 'CHURN RISK',
      value: 'Dynamic',
      subtitle: 'Risk Monitoring'
    }
  ]

  return (
    <Layout
      pageTitle="Member Analytics"
      darkMode={darkMode}
      sidebarExpanded={sidebarExpanded}
      onToggleDarkMode={() => setDarkMode(!darkMode)}
      onLogout={handleLogout}
    >
      <StandardPageTemplate 
        pageName="Member Analytics"
        kpiData={memberAnalyticsKPIs}
        showComingSoon={true}
      />
    </Layout>
  )
}
