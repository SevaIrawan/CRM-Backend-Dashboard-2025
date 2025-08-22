'use client'

import React from 'react'
import Layout from '@/components/Layout'
import ComingSoon from '@/components/ComingSoon'

export default function MYRMemberAnalytic() {
  const handleLogout = () => {
    console.log('Logout clicked')
  }

  return (
    <Layout
      pageTitle="Member Analytic MYR"
      darkMode={false}
      sidebarExpanded={true}
      onToggleDarkMode={() => {}}
      onLogout={handleLogout}
    >
      <ComingSoon 
        title="MYR Member Analytic" 
        subtitle="Coming Soon"
        message="Fitur MYR Member Analytic sedang dalam pengembangan. Kami sedang bekerja keras untuk memberikan analisis komprehensif untuk member MYR. Silakan periksa kembali nanti!"
      />
    </Layout>
  )
}