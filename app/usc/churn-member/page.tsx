'use client'

import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import ComingSoon from '@/components/ComingSoon'

export default function USCChurnMemberPage() {
  return (
    <Layout>
      <Frame variant="compact">
        <ComingSoon 
          title="USC Churn Member"
          subtitle="Churn member analysis for USC currency will be available soon"
        />
      </Frame>
    </Layout>
  )
}
