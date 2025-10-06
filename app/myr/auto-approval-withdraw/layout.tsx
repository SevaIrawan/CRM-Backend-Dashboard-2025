import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Auto Approval Withdrawal Monitoring MYR - NexMax Dashboard',
  description: 'Auto Approval Withdraw Monitoring for MYR Currency',
}

export default function AutoApprovalMonitorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
