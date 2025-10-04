'use client'

import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import ComingSoon from '@/components/ComingSoon'

export default function MYRChurnMemberPage() {
  return (
    <Layout>
      <Frame variant="compact">
        <ComingSoon 
          title="MYR Churn Member"
          subtitle="Churn member analysis for MYR currency will be available soon"
        />
      </Frame>
    </Layout>
  )
}
