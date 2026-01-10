'use client'

import React, { useState, useCallback } from 'react'
import ToastNotification, { ToastType } from '@/components/ToastNotification'

interface ToastState {
  message: string
  type: ToastType
  show: boolean
  duration?: number
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'info',
    show: false
  })

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    setToast({
      message,
      type,
      show: true,
      duration
    })
  }, [])

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }))
  }, [])

  const ToastComponent = () => (
    <ToastNotification
      message={toast.message}
      type={toast.type}
      duration={toast.duration}
      show={toast.show}
      onClose={hideToast}
    />
  )

  return {
    showToast,
    hideToast,
    ToastComponent
  }
}
