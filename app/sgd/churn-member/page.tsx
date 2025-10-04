'use client'

import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import ComingSoon from '@/components/ComingSoon'

export default function SGDChurnMemberPage() {
  return (
    <Layout>
      <Frame variant="compact">
        <ComingSoon 
          title="SGD Churn Member"
          subtitle="Churn member analysis for SGD currency will be available soon"
        />
      </Frame>
    </Layout>
  )
}
