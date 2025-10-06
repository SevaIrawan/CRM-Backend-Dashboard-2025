import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Auto Approval Withdrawal Monitoring MYR - NexMax Dashboard',
  description: 'Auto Approval Withdrawal Monitoring for MYR Currency',
}

export default function AutoApprovalWithdrawLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
