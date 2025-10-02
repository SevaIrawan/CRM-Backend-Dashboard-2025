'use client'

import React from 'react'
import Layout from '@/components/Layout'
import ComingSoon from '@/components/ComingSoon'

export default function DashboardPage() {
  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Overview of all business metrics</p>
        </div>
        
        <ComingSoon 
          title="Dashboard Coming Soon"
          description="Comprehensive dashboard with all business metrics will be available soon."
        />
      </div>
    </Layout>
  )
}
