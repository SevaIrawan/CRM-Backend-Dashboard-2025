'use client'

import React from 'react'
import Layout from '@/components/Layout'
import ComingSoon from '@/components/ComingSoon'

export default function MYROverviewPage() {
  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview MYR</h1>
          <p className="text-gray-600 dark:text-gray-400">Malaysian Ringgit currency overview and analytics</p>
        </div>
        
        <ComingSoon 
          title="Overview MYR Coming Soon"
          subtitle="Malaysian Ringgit currency overview and analytics will be available soon."
        />
      </div>
    </Layout>
  )
}
