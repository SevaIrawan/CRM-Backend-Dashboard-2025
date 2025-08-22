'use client'

import React from 'react'
import Layout from '@/components/Layout'
import ComingSoon from '@/components/ComingSoon'

export default function MYROverview() {
  const handleLogout = () => {
    console.log('Logout clicked')
  }

  return (
    <Layout
      pageTitle="Overview MYR"
      darkMode={false}
      sidebarExpanded={true}
      onToggleDarkMode={() => {}}
      onLogout={handleLogout}
    >
      <ComingSoon 
        title="MYR Overview" 
        subtitle="Coming Soon"
        message="Fitur MYR Overview sedang dalam pengembangan. Kami sedang bekerja keras untuk memberikan analisis komprehensif untuk pasar MYR. Silakan periksa kembali nanti!"
      />
    </Layout>
  )
}
