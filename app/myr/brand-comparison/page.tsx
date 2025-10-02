'use client'

import React from 'react'
import Layout from '@/components/Layout'
import ComingSoon from '@/components/ComingSoon'

export default function MYRBrandComparisonPage() {
  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Brand Comparison MYR</h1>
          <p className="text-gray-600 dark:text-gray-400">Malaysian Ringgit currency brand comparison analytics</p>
        </div>
        
        <ComingSoon 
          title="Brand Comparison MYR Coming Soon"
          subtitle="Malaysian Ringgit currency brand comparison analytics will be available soon."
        />
      </div>
    </Layout>
  )
}
