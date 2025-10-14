// ========================================
// FEEDBACK SYSTEM - TypeScript Types
// ========================================

export type FeedbackCategory = 'bug' | 'feature_request' | 'question' | 'ui_ux' | 'other'
export type FeedbackStatus = 'pending' | 'replied' | 'in_progress' | 'resolved' | 'closed'
export type FeedbackPriority = 'low' | 'normal' | 'high' | 'urgent'
export type SenderType = 'user' | 'admin'

// Main Feedback Interface
export interface Feedback {
  id: number
  
  // User Info
  user_id: string | null
  username: string
  email: string | null
  role: string | null
  
  // Feedback Info
  subject: string | null
  category: FeedbackCategory
  initial_message: string
  
  // Page Context
  page_url: string | null
  page_title: string | null
  
  // Status & Priority
  status: FeedbackStatus
  priority: FeedbackPriority
  
  // Assignment
  assigned_to: string | null
  
  // Metadata
  browser: string | null
  device_type: string | null
  os: string | null
  ip_address: string | null
  
  // Timestamps
  created_at: string
  updated_at: string
  last_reply_at: string | null
  resolved_at: string | null
  closed_at: string | null
  
  // Computed/Joined fields (optional)
  unread_count?: number
  reply_count?: number
  last_reply?: FeedbackReply
  attachments?: FeedbackAttachment[]
}

// Feedback Reply Interface
export interface FeedbackReply {
  id: number
  feedback_id: number
  
  // Sender Info
  sender_type: SenderType
  sender_id: string | null
  sender_username: string
  sender_role: string | null
  
  // Message
  message: string
  
  // Read Status
  is_read: boolean
  read_at: string | null
  
  // Timestamp
  created_at: string
  
  // Optional attachments
  attachments?: FeedbackAttachment[]
}

// Feedback Attachment Interface
export interface FeedbackAttachment {
  id: number
  feedback_id: number
  reply_id: number | null
  
  // File Info
  file_name: string
  file_type: string
  file_size: number | null
  file_url: string
  
  // Uploader
  uploaded_by: string
  
  // Timestamp
  created_at: string
}

// Submit Feedback Data (from user)
export interface SubmitFeedbackData {
  category: FeedbackCategory
  subject?: string
  message: string
  page_url?: string
  page_title?: string
  attachments?: File[]
}

// Submit Reply Data
export interface SubmitReplyData {
  feedback_id: number
  message: string
  sender_type: SenderType
  attachments?: File[]
}

// Update Feedback Status Data (admin only)
export interface UpdateFeedbackStatusData {
  feedback_id: number
  status?: FeedbackStatus
  priority?: FeedbackPriority
  assigned_to?: string
}

// Feedback List Filters (for admin page)
export interface FeedbackFilters {
  status?: FeedbackStatus | 'all'
  priority?: FeedbackPriority | 'all'
  category?: FeedbackCategory | 'all'
  search?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

// Unread Count Response
export interface UnreadCountResponse {
  success: boolean
  unread_count: number
  unread_by_priority?: {
    urgent: number
    high: number
    normal: number
    low: number
  }
}

// Feedback List Response (with pagination)
export interface FeedbackListResponse {
  success: boolean
  data: Feedback[]
  pagination: {
    currentPage: number
    totalPages: number
    totalRecords: number
    limit: number
  }
}

// Single Feedback Detail Response
export interface FeedbackDetailResponse {
  success: boolean
  feedback: Feedback
  replies: FeedbackReply[]
}

// Category Display Names
export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Bug Report',
  feature_request: 'Feature Request',
  question: 'Question',
  ui_ux: 'UI/UX Feedback',
  other: 'Other'
}

// Status Display Names & Colors
export const FEEDBACK_STATUS_CONFIG: Record<FeedbackStatus, { label: string; color: string; bgColor: string }> = {
  pending: { 
    label: 'Pending', 
    color: '#f59e0b', 
    bgColor: '#fef3c7' 
  },
  replied: { 
    label: 'Replied', 
    color: '#3b82f6', 
    bgColor: '#dbeafe' 
  },
  in_progress: { 
    label: 'In Progress', 
    color: '#8b5cf6', 
    bgColor: '#ede9fe' 
  },
  resolved: { 
    label: 'Resolved', 
    color: '#10b981', 
    bgColor: '#d1fae5' 
  },
  closed: { 
    label: 'Closed', 
    color: '#6b7280', 
    bgColor: '#f3f4f6' 
  }
}

// Priority Display Names & Colors
export const FEEDBACK_PRIORITY_CONFIG: Record<FeedbackPriority, { label: string; color: string; bgColor: string }> = {
  low: { 
    label: 'Low', 
    color: '#6b7280', 
    bgColor: '#f3f4f6' 
  },
  normal: { 
    label: 'Normal', 
    color: '#3b82f6', 
    bgColor: '#dbeafe' 
  },
  high: { 
    label: 'High', 
    color: '#f59e0b', 
    bgColor: '#fef3c7' 
  },
  urgent: { 
    label: 'Urgent', 
    color: '#ef4444', 
    bgColor: '#fee2e2' 
  }
}

