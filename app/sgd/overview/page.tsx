'use client'

import React from 'react'
import Layout from '@/components/Layout'
import ComingSoon from '@/components/ComingSoon'

export default function SGDOverviewPage() {
  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview SGD</h1>
          <p className="text-gray-600 dark:text-gray-400">Singapore Dollar currency overview and analytics</p>
        </div>
        
        <ComingSoon 
          title="Overview SGD Coming Soon"
          description="Singapore Dollar currency overview and analytics will be available soon."
        />
      </div>
    </Layout>
  )
}
