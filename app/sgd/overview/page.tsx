'use client'

import React from 'react'
import Layout from '@/components/Layout'
import ComingSoon from '@/components/ComingSoon'

export default function SGDOverview() {
  const handleLogout = () => {
    console.log('Logout clicked')
  }

  return (
    <Layout
      pageTitle="Overview SGD"
      darkMode={false}
      sidebarExpanded={true}
      onToggleDarkMode={() => {}}
      onLogout={handleLogout}
    >
      <ComingSoon 
        title="SGD Overview" 
        subtitle="Coming Soon"
        message="Fitur SGD Overview sedang dalam pengembangan. Kami sedang bekerja keras untuk memberikan analisis komprehensif untuk pasar SGD. Silakan periksa kembali nanti!"
      />
    </Layout>
  )
}
