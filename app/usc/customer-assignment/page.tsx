'use client'

import React from 'react'
import Layout from '@/components/Layout'
import ComingSoon from '@/components/ComingSoon'

export default function USCCustomerAssignmentPage() {
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
            Customer Assignment
          </h1>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280' 
          }}>
            Assign customers to SNR Marketing accounts
          </p>
        </div>
        
        <ComingSoon 
          title="Customer Assignment - Coming Soon"
          subtitle="Assign customers to SNR Marketing accounts"
          message="This page will allow Manager and Squad Lead to assign customers to SNR Marketing accounts. You'll be able to select customers, choose SNR account, set handler name, and manage customer assignments."
        />
      </div>
    </Layout>
  )
}

