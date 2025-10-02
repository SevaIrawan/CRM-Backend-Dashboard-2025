'use client'

import React from 'react'
import Layout from '@/components/Layout'
import ComingSoon from '@/components/ComingSoon'

export default function SGDPage() {
  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SGD Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Singapore Dollar currency analytics and reports</p>
        </div>
        
        <ComingSoon 
          title="SGD Dashboard Coming Soon"
          subtitle="Singapore Dollar currency-specific analytics and reports will be available soon."
        />
      </div>
    </Layout>
  )
}
