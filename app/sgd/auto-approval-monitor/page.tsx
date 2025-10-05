'use client'

import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import ComingSoon from '@/components/ComingSoon'

export default function SGDAutoApprovalMonitorPage() {
  return (
    <Layout>
      <Frame variant="compact">
        <ComingSoon 
          title="SGD Auto Approval Monitor"
          subtitle="Auto approval monitoring and analysis for SGD currency will be available soon"
        />
      </Frame>
    </Layout>
  )
}
