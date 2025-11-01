'use client'

import React from 'react'
import Layout from '@/components/Layout'
import SubheaderNotice from '@/components/SubheaderNotice'
import ComingSoon from '@/components/ComingSoon'

export default function USCBusinessPerformancePage() {
  return (
    <Layout customSubHeader={<div className="dashboard-subheader"><div className="subheader-title"><SubheaderNotice show={true} label="NOTICE" message="Verification in progress — Please allow until 14:00 GMT+7 for adjustment validation to ensure 100% accurate data." /></div></div>}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Performance USC</h1>
          <p className="text-gray-600 dark:text-gray-400">US Dollar Cambodia currency business performance metrics and analytics</p>
        </div>
        
        <ComingSoon 
          title="Business Performance USC Coming Soon"
          subtitle="US Dollar Cambodia currency business performance metrics and analytics will be available soon."
        />
      </div>
    </Layout>
  )
}

