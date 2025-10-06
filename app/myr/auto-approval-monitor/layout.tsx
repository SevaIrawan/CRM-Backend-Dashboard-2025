import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Auto Approval Deposit MYR - NexMax Dashboard',
  description: 'Auto Approval Deposit Monitoring for MYR Currency',
}

export default function AutoApprovalMonitorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
