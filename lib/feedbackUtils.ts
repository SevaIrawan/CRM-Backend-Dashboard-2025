// ========================================
// FEEDBACK SYSTEM - Utility Functions
// ========================================

import { UAParser } from 'ua-parser-js'

/**
 * Play notification sound
 */
export function playNotificationSound() {
  if (typeof window === 'undefined') return
  
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    // Create oscillator (simple beep sound)
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Configure sound
    oscillator.frequency.value = 800 // Frequency in Hz
    oscillator.type = 'sine'
    
    // Volume
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    
    // Play
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
    
    console.log('🔔 Notification sound played')
  } catch (error) {
    console.error('❌ Failed to play notification sound:', error)
  }
}

/**
 * Get browser and device info
 */
export function getBrowserDeviceInfo() {
  if (typeof window === 'undefined') {
    return {
      browser: 'Unknown',
      device: 'Unknown',
      os: 'Unknown',
      userAgent: ''
    }
  }
  
  const parser = new UAParser(window.navigator.userAgent)
  
  return {
    browser: parser.getBrowser().name || 'Unknown',
    device: parser.getDevice().type || 'Desktop',
    os: parser.getOS().name || 'Unknown',
    userAgent: window.navigator.userAgent
  }
}

/**
 * Get current page info
 */
export function getCurrentPageInfo() {
  if (typeof window === 'undefined') {
    return {
      url: '',
      title: ''
    }
  }
  
  return {
    url: window.location.pathname,
    title: document.title
  }
}

/**
 * Format file size (bytes to human readable)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024 // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds 5MB limit. Current: ${formatFileSize(file.size)}`
    }
  }
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed: JPG, PNG, GIF, WebP`
    }
  }
  
  return { valid: true }
}

/**
 * Convert file to base64 (for storage)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert file to base64'))
      }
    }
    
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Format timestamp (relative time)
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else {
    return time.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

/**
 * Format timestamp (absolute time in GMT+7)
 */
export function formatAbsoluteTime(timestamp: string): string {
  const date = new Date(timestamp)
  const gmt7Time = new Date(date.getTime() + (7 * 60 * 60 * 1000))
  
  return gmt7Time.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Get user session info
 */
export function getUserSession() {
  if (typeof window === 'undefined') return null
  
  const session = localStorage.getItem('nexmax_session')
  if (!session) return null
  
  try {
    return JSON.parse(session)
  } catch (error) {
    console.error('Failed to parse user session:', error)
    return null
  }
}

/**
 * Scroll to bottom (for chat panel)
 */
export function scrollToBottom(elementId: string, smooth = true) {
  if (typeof window === 'undefined') return
  
  setTimeout(() => {
    const element = document.getElementById(elementId)
    if (element) {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      })
    }
  }, 100)
}

