'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Feedback, 
  FeedbackReply, 
  FeedbackCategory,
  FEEDBACK_CATEGORY_LABELS 
} from '@/lib/feedbackTypes'
import {
  playNotificationSound,
  getBrowserDeviceInfo,
  getCurrentPageInfo,
  getUserSession,
  formatRelativeTime,
  scrollToBottom,
  validateFileUpload,
  fileToBase64,
  formatFileSize
} from '@/lib/feedbackUtils'

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<FeedbackCategory>('question')
  const [loading, setLoading] = useState(false)
  const [conversations, setConversations] = useState<Feedback[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Feedback | null>(null)
  const [replies, setReplies] = useState<FeedbackReply[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [attachments, setAttachments] = useState<File[]>([])
  const [userSession, setUserSession] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastUnreadCountRef = useRef(0)

  // Fix hydration issue by only getting session on client side
  useEffect(() => {
    setIsClient(true)
    setUserSession(getUserSession())
  }, [])

  // Fetch user's conversations
  const fetchConversations = async () => {
    if (!userSession) return

    try {
      const { data, error } = await supabase
        .from('user_feedbacks')
        .select('*')
        .eq('user_id', userSession.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setConversations((data || []) as unknown as Feedback[])
    } catch (error) {
      console.error('Error fetching conversations:', error)
    }
  }

  // Fetch replies for selected conversation
  const fetchReplies = async (feedbackId: number) => {
    try {
      const { data, error } = await supabase
        .from('feedback_replies')
        .select('*')
        .eq('feedback_id', feedbackId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setReplies((data || []) as unknown as FeedbackReply[])
      
      // Mark as read
      await markAsRead(feedbackId)
      
      // Scroll to bottom
      scrollToBottom('feedback-messages')
    } catch (error) {
      console.error('Error fetching replies:', error)
    }
  }

  // Mark replies as read
  const markAsRead = async (feedbackId: number) => {
    try {
      await supabase
        .from('feedback_replies')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('feedback_id', feedbackId)
        .eq('sender_type', 'admin')
        .eq('is_read', false)
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  // Check unread count
  const checkUnreadCount = async () => {
    if (!userSession) return

    try {
      const { count, error } = await supabase
        .from('feedback_replies')
        .select('*', { count: 'exact', head: true })
        .eq('sender_type', 'admin')
        .eq('is_read', false)
        .in('feedback_id', conversations.map(c => c.id))

      if (error) throw error
      
      const newCount = count || 0
      setUnreadCount(newCount)

      // Play sound if new message arrived
      if (newCount > lastUnreadCountRef.current && lastUnreadCountRef.current > 0) {
        playNotificationSound()
      }
      
      lastUnreadCountRef.current = newCount
    } catch (error) {
      console.error('Error checking unread:', error)
    }
  }

  // Submit new feedback
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !userSession) return

    setLoading(true)
    try {
      console.log('📤 [FeedbackWidget] Submitting feedback:', {
        category,
        message: message.substring(0, 50) + '...',
        userSession: userSession?.username
      })
      const deviceInfo = getBrowserDeviceInfo()
      const pageInfo = getCurrentPageInfo()

      // Upload attachments if any
      const attachmentUrls: string[] = []
      for (const file of attachments) {
        const base64 = await fileToBase64(file)
        attachmentUrls.push(base64)
      }

      // Submit feedback via API
      const requestBody = {
        user_id: userSession.id || null, // Let API handle UUID validation
        username: userSession.username,
        email: userSession.email,
        role: userSession.role,
        category: category,
        message: message,
        page_url: pageInfo.url,
        page_title: pageInfo.title,
        browser: deviceInfo.browser,
        device_type: deviceInfo.device,
        os: deviceInfo.os,
        attachments: attachmentUrls
      }
      
      console.log('📤 [FeedbackWidget] Request body:', requestBody)
      
      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      console.log('📤 [FeedbackWidget] Response status:', response.status)

      const result = await response.json()
      console.log('📤 [FeedbackWidget] Submit response:', result)
      
      if (!result.success) {
        console.error('❌ [FeedbackWidget] Submit failed:', result.error)
        throw new Error(result.error || 'Failed to submit feedback')
      }

      const feedbackData = result.data

      // Reset form
      setMessage('')
      setCategory('question')
      setAttachments([])
      
      // Refresh conversations
      await fetchConversations()
      
      // Select new conversation
      setSelectedConversation(feedbackData as unknown as Feedback)
      await fetchReplies((feedbackData as any).id)

      alert('✅ Feedback submitted successfully!')
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('❌ Failed to submit feedback. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Send reply to existing conversation
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !selectedConversation || !userSession) return

    setLoading(true)
    try {
      // Upload attachments if any
      const attachmentUrls: string[] = []
      for (const file of attachments) {
        const base64 = await fileToBase64(file)
        attachmentUrls.push(base64)
      }

      // Send reply via API
      const response = await fetch('/api/feedback/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback_id: selectedConversation.id,
          message: message,
          sender_type: 'user',
          sender_id: userSession.id,
          sender_username: userSession.username,
          sender_role: userSession.role,
          attachments: attachmentUrls
        }),
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send reply')
      }

      // Reset message
      setMessage('')
      setAttachments([])
      
      // Refresh replies
      await fetchReplies(selectedConversation.id)
    } catch (error) {
      console.error('Error sending reply:', error)
      alert('❌ Failed to send reply. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate each file
    const validFiles: File[] = []
    for (const file of files) {
      const validation = validateFileUpload(file)
      if (validation.valid) {
        validFiles.push(file)
      } else {
        alert(`❌ ${file.name}: ${validation.error}`)
      }
    }
    
    setAttachments(prev => [...prev, ...validFiles])
  }

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // Real-time subscription for new replies (disabled for now - using polling)
  // useEffect(() => {
  //   // Real-time subscriptions temporarily disabled
  // }, [userSession, conversations, selectedConversation])

  // Polling backup (every 30 seconds)
  useEffect(() => {
    if (!userSession) return

    const interval = setInterval(() => {
      checkUnreadCount()
      if (selectedConversation) {
        fetchReplies(selectedConversation.id)
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [userSession, selectedConversation])

  // Initial load
  useEffect(() => {
    if (isOpen && userSession) {
      fetchConversations()
      checkUnreadCount()
    }
  }, [isOpen, userSession])

  // Don't render on server side to prevent hydration issues
  if (!isClient) {
    return null
  }

  // Don't show widget if not logged in or if admin
  if (!userSession || userSession.role === 'admin') {
    return null
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          zIndex: 9998,
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)'
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
      >
        💬
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            backgroundColor: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '30px',
          width: '400px',
          height: '600px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                {selectedConversation ? 'Conversation' : 'Feedback & Support'}
              </h3>
              <p style={{ margin: '5px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                {selectedConversation ? `#${selectedConversation.id}` : 'How can we help you?'}
              </p>
            </div>
            <button
              onClick={() => {
                setIsOpen(false)
                setSelectedConversation(null)
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                width: '30px',
                height: '30px'
              }}
            >
              ×
            </button>
          </div>

          {/* Content */}
          {!selectedConversation ? (
            // Conversation List or New Feedback Form
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Conversations List */}
              {conversations.length > 0 && (
                <div style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto',
                  borderBottom: '1px solid #e5e7eb',
                  padding: '10px'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#6b7280' }}>
                    Your Conversations
                  </h4>
                  {conversations.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setSelectedConversation(conv)
                        fetchReplies(conv.id)
                      }}
                      style={{
                        padding: '10px',
                        marginBottom: '5px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#3b82f6' }}>
                          {FEEDBACK_CATEGORY_LABELS[conv.category]}
                        </span>
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                          {formatRelativeTime(conv.updated_at)}
                        </span>
                      </div>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '13px', 
                        color: '#374151',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {conv.initial_message}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* New Feedback Form */}
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Send New Feedback</h4>
                <form onSubmit={handleSubmitFeedback}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        fontSize: '14px'
                      }}
                    >
                      {Object.entries(FEEDBACK_CATEGORY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your feedback, question, or issue..."
                      rows={6}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        fontSize: '14px',
                        resize: 'none',
                        fontFamily: 'inherit'
                      }}
                      required
                    />
                  </div>

                  {/* Attachments */}
                  {attachments.length > 0 && (
                    <div style={{ marginBottom: '15px' }}>
                      {attachments.map((file, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '6px',
                          marginBottom: '5px',
                          fontSize: '12px'
                        }}>
                          <span>{file.name} ({formatFileSize(file.size)})</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: '16px'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '10px 15px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        flex: 1
                      }}
                    >
                      📎 Attach
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !message.trim()}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                        color: 'white',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        flex: 2
                      }}
                    >
                      {loading ? 'Sending...' : 'Send Feedback'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            // Conversation View
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Back Button */}
              <div style={{ padding: '10px 20px', borderBottom: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => {
                    setSelectedConversation(null)
                    setReplies([])
                    fetchConversations()
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '0'
                  }}
                >
                  ← Back to conversations
                </button>
              </div>

              {/* Messages */}
              <div 
                id="feedback-messages"
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  padding: '20px',
                  backgroundColor: '#f9fafb'
                }}
              >
                {replies.map(reply => (
                  <div
                    key={reply.id}
                    style={{
                      marginBottom: '15px',
                      display: 'flex',
                      justifyContent: reply.sender_type === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      maxWidth: '80%',
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: reply.sender_type === 'user' ? '#3b82f6' : 'white',
                      color: reply.sender_type === 'user' ? 'white' : '#374151',
                      boxShadow: reply.sender_type === 'admin' ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none'
                    }}>
                      <div style={{ 
                        fontSize: '11px', 
                        opacity: 0.8, 
                        marginBottom: '5px',
                        fontWeight: '500'
                      }}>
                        {reply.sender_username} {reply.sender_type === 'admin' && '(Admin)'}
                      </div>
                      <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                        {reply.message}
                      </div>
                      <div style={{ 
                        fontSize: '10px', 
                        opacity: 0.7, 
                        marginTop: '5px',
                        textAlign: 'right'
                      }}>
                        {formatRelativeTime(reply.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <div style={{ 
                padding: '15px 20px', 
                borderTop: '1px solid #e5e7eb',
                backgroundColor: 'white'
              }}>
                {attachments.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    {attachments.map((file, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '6px',
                        marginBottom: '5px',
                        fontSize: '11px'
                      }}>
                        <span>{file.name}</span>
                        <button
                          onClick={() => removeAttachment(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '10px' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontSize: '18px'
                    }}
                  >
                    📎
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px'
                    }}
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading || !message.trim()}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                      color: 'white',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {loading ? '...' : 'Send'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

