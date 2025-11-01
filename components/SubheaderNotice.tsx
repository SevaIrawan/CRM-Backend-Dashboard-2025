'use client'

import React from 'react'

interface SubheaderNoticeProps {
	show?: boolean
	label?: string
	message: string
	icon?: React.ReactNode
}

export default function SubheaderNotice({ show = true, label = 'NOTICE', message, icon = '⚠️' }: SubheaderNoticeProps) {
	if (!show) return null

	return (
		<div
			title={typeof message === 'string' ? message : 'Notice'}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: '8px',
				padding: '6px 12px',
				borderRadius: '9999px',
				background: '#fde047',
				border: '1px solid #f59e0b',
				color: '#111827',
				fontSize: '12px',
				fontWeight: 700,
				boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
			}}
		>
			<span style={{ fontSize: 14 as number, lineHeight: 1 }}>{icon as any}</span>
			<span style={{ textTransform: 'uppercase', fontWeight: 800 }}>{label}</span>
			<span style={{ opacity: 0.6 }}>•</span>
			<span>{message}</span>
		</div>
	)
}


