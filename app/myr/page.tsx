'use client'

import React from 'react'
import Layout from '@/components/Layout'
import ComingSoon from '@/components/ComingSoon'

export default function MYRPage() {
  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MYR Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Malaysian Ringgit currency analytics and reports</p>
        </div>
        
        <ComingSoon 
          title="MYR Dashboard Coming Soon"
          subtitle="Malaysian Ringgit currency-specific analytics and reports will be available soon."
        />
      </div>
    </Layout>
  )
}
