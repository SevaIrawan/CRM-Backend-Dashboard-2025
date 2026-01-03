'use client'

import React from 'react'
import Layout from '@/components/Layout'
import ComingSoon from '@/components/ComingSoon'

export default function SGDSNRCustomersPage() {
  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            SNR Customers
          </h1>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280' 
          }}>
            View and manage customers assigned to your SNR account
          </p>
        </div>
        
        <ComingSoon 
          title="SNR Customers - Coming Soon"
          subtitle="Customer listing and management for SNR Marketing"
          message="This page will display all customers assigned to your SNR account. You'll be able to view customer details, track assignments, and manage your customer portfolio."
        />
      </div>
    </Layout>
  )
}

