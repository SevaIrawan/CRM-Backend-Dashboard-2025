'use client'

import React from 'react'
import Layout from '@/components/Layout'
import ComingSoon from '@/components/ComingSoon'

export default function SGDMemberAnalytic() {
  const handleLogout = () => {
    console.log('Logout clicked')
  }

  return (
    <Layout
      pageTitle="Member Analytic SGD"
      darkMode={false}
      sidebarExpanded={true}
      onToggleDarkMode={() => {}}
      onLogout={handleLogout}
    >
      <ComingSoon 
        title="SGD Member Analytic" 
        subtitle="Coming Soon"
        message="Fitur SGD Member Analytic sedang dalam pengembangan. Kami sedang bekerja keras untuk memberikan analisis komprehensif untuk member SGD. Silakan periksa kembali nanti!"
      />
    </Layout>
  )
}