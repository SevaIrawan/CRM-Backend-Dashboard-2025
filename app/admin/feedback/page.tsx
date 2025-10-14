'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import { supabase } from '@/lib/supabase'
import {
  Feedback,
  FeedbackReply,
  FeedbackStatus,
  FeedbackPriority,
  FeedbackCategory,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_STATUS_CONFIG,
  FEEDBACK_PRIORITY_CONFIG
} from '@/lib/feedbackTypes'
import {
  playNotificationSound,
  formatRelativeTime,
  formatAbsoluteTime,
  getUserSession,
  scrollToBottom
} from '@/lib/feedbackUtils'

export default function AdminFeedbackPage() {
  const router = useRouter()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [replies, setReplies] = useState<FeedbackReply[]>([])
  const [replyMessage, setReplyMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filters, setFilters] = useState({
    status: 'all' as FeedbackStatus | 'all',
    priority: 'all' as FeedbackPriority | 'all',
    category: 'all' as FeedbackCategory | 'all',
    search: ''
  })

  const [userSession, setUserSession] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [lastUnreadCountRef, setLastUnreadCountRef] = useState(0)

  // Fix hydration issue by only getting session on client side
  useEffect(() => {
    setIsClient(true)
    setUserSession(getUserSession())
  }, [])

  // Check admin access
  useEffect(() => {
    if (isClient && (!userSession || userSession.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [userSession, router, isClient])

  // Fetch all feedbacks
  const fetchFeedbacks = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('user_feedbacks')
        .select('*')
        .order('updated_at', { ascending: false })

      // Apply filters
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters.priority !== 'all') {
        query = query.eq('priority', filters.priority)
      }
      if (filters.category !== 'all') {
        query = query.eq('category', filters.category)
      }
      if (filters.search.trim()) {
        query = query.or(`username.ilike.%${filters.search}%,initial_message.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error

      // Get unread count for each feedback
      const feedbacksWithUnread = await Promise.all(
        (data || []).map(async (feedback: any) => {
          const { count } = await supabase
            .from('feedback_replies')
            .select('*', { count: 'exact', head: true })
            .eq('feedback_id', feedback.id)
            .eq('sender_type', 'user')
            .eq('is_read', false)

          return {
            ...feedback,
            unread_count: count || 0
          }
        })
      )

      console.log('📋 [AdminFeedback] Fetched feedbacks:', feedbacksWithUnread.length, feedbacksWithUnread)
      setFeedbacks(feedbacksWithUnread)
    } catch (error) {
      console.error('Error fetching feedbacks:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch replies for selected feedback
  const fetchReplies = async (feedbackId: number) => {
    try {
      const { data, error } = await supabase
        .from('feedback_replies')
        .select('*')
        .eq('feedback_id', feedbackId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setReplies((data || []) as unknown as FeedbackReply[])

      // Mark user replies as read
      await supabase
        .from('feedback_replies')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('feedback_id', feedbackId)
        .eq('sender_type', 'user')
        .eq('is_read', false)

      // Scroll to bottom
      scrollToBottom('admin-feedback-messages')

      // Refresh feedback list to update unread counts
      fetchFeedbacks()
    } catch (error) {
      console.error('Error fetching replies:', error)
    }
  }

  // Send reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyMessage.trim() || !selectedFeedback || !userSession) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('feedback_replies')
        .insert({
          feedback_id: selectedFeedback.id,
          sender_type: 'admin',
          sender_id: userSession.id,
          sender_username: userSession.username,
          sender_role: userSession.role,
          message: replyMessage,
          is_read: true
        })

      if (error) throw error

      // Update feedback status to 'replied' if pending
      if (selectedFeedback.status === 'pending') {
        await supabase
          .from('user_feedbacks')
          .update({ status: 'replied' })
          .eq('id', selectedFeedback.id)
      }

      setReplyMessage('')
      await fetchReplies(selectedFeedback.id)
      await fetchFeedbacks()
    } catch (error) {
      console.error('Error sending reply:', error)
      alert('❌ Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  // Update feedback status
  const updateStatus = async (feedbackId: number, status: FeedbackStatus) => {
    try {
      const updateData: any = { status }
      
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString()
      } else if (status === 'closed') {
        updateData.closed_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('user_feedbacks')
        .update(updateData)
        .eq('id', feedbackId)

      if (error) throw error

      await fetchFeedbacks()
      if (selectedFeedback && selectedFeedback.id === feedbackId) {
        const updated = { ...selectedFeedback, ...updateData }
        setSelectedFeedback(updated)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('❌ Failed to update status')
    }
  }

  // Update feedback priority
  const updatePriority = async (feedbackId: number, priority: FeedbackPriority) => {
    try {
      const { error } = await supabase
        .from('user_feedbacks')
        .update({ priority })
        .eq('id', feedbackId)

      if (error) throw error

      await fetchFeedbacks()
      if (selectedFeedback && selectedFeedback.id === feedbackId) {
        setSelectedFeedback({ ...selectedFeedback, priority })
      }
    } catch (error) {
      console.error('Error updating priority:', error)
      alert('❌ Failed to update priority')
    }
  }

  // Check total unread count
  const checkUnreadCount = async () => {
    try {
      // Get all feedbacks
      const { data: allFeedbacks, error: feedbackError } = await supabase
        .from('user_feedbacks')
        .select('id')

      if (feedbackError) throw feedbackError

      // Get all admin replies
      const { data: adminReplies, error: repliesError } = await supabase
        .from('feedback_replies')
        .select('feedback_id')
        .eq('sender_type', 'admin')

      if (repliesError) throw repliesError

      // Count feedbacks that have no admin replies
      const feedbacksWithAdminReplies = new Set(adminReplies?.map(reply => reply.feedback_id) || [])
      const unreadCount = (allFeedbacks || []).filter(feedback => !feedbacksWithAdminReplies.has(feedback.id)).length

      setUnreadCount(unreadCount)

      // Play sound if new message
      if (unreadCount > lastUnreadCountRef && lastUnreadCountRef > 0) {
        playNotificationSound()
      }
      
      setLastUnreadCountRef(unreadCount)
    } catch (error) {
      console.error('Error checking unread:', error)
    }
  }

  // Real-time subscription (disabled for now - using polling)
  // useEffect(() => {
  //   // Real-time subscriptions temporarily disabled
  // }, [userSession, selectedFeedback])

  // Polling backup (30 seconds)
  useEffect(() => {
    if (!userSession || userSession.role !== 'admin') return

    const interval = setInterval(() => {
      checkUnreadCount()
      fetchFeedbacks()
      if (selectedFeedback) {
        fetchReplies(selectedFeedback.id)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [userSession, selectedFeedback])

  // Initial load
  useEffect(() => {
    if (userSession && userSession.role === 'admin') {
      fetchFeedbacks()
      checkUnreadCount()
    }
  }, [userSession, filters])

  // Don't render on server side to prevent hydration issues
  if (!isClient) {
    return null
  }

  if (!userSession || userSession.role !== 'admin') {
    return null
  }

  return (
    <Layout pageTitle="Feedback & Support Management">
      <div style={{ padding: '20px' }}>
        {/* Stats & Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          {/* Unread Count */}
          <Frame>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#6b7280' }}>Unread Messages</h3>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ef4444' }}>
                {unreadCount}
              </div>
            </div>
          </Frame>

          {/* Filters */}
          <Frame>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
              >
                <option value="all">All Status</option>
                {Object.entries(FEEDBACK_STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value as any })}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
              >
                <option value="all">All Priority</option>
                {Object.entries(FEEDBACK_PRIORITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
          </Frame>

          <Frame>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value as any })}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
              >
                <option value="all">All Categories</option>
                {Object.entries(FEEDBACK_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Search feedbacks..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
              />
            </div>
          </Frame>
        </div>

        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedFeedback ? '1fr 2fr' : '1fr', gap: '20px' }}>
          {/* Feedback List */}
          <Frame>
            <div style={{ 
              padding: '20px', 
              height: '70vh', 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                📋 Feedback List ({feedbacks.length})
              </h3>
              
              {/* Debug Info */}
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px', padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                <strong>Debug Info:</strong><br/>
                • Loading: {loading.toString()}<br/>
                • Feedbacks Count: {feedbacks.length}<br/>
                • Selected Feedback: {selectedFeedback ? selectedFeedback.id : 'None'}
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  Loading feedbacks...
                </div>
              ) : feedbacks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  No feedbacks found
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '500px', overflowY: 'auto' }}>
                  {feedbacks.map(feedback => (
                    <div
                      key={feedback.id}
                      onClick={() => {
                        setSelectedFeedback(feedback)
                        fetchReplies(feedback.id)
                      }}
                      style={{
                        padding: '15px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: selectedFeedback?.id === feedback.id ? '#f0f9ff' : 'white',
                        borderColor: selectedFeedback?.id === feedback.id ? '#3b82f6' : '#e5e7eb',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                    >
                      {/* Unread Badge */}
                      {(feedback.unread_count || 0) > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontWeight: 'bold'
                        }}>
                          {feedback.unread_count} new
                        </div>
                      )}

                      {/* Header */}
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: FEEDBACK_PRIORITY_CONFIG[feedback.priority].color,
                          color: 'white'
                        }}>
                          {FEEDBACK_PRIORITY_CONFIG[feedback.priority].label}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: FEEDBACK_STATUS_CONFIG[feedback.status].color,
                          color: 'white'
                        }}>
                          {FEEDBACK_STATUS_CONFIG[feedback.status].label}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          backgroundColor: '#f3f4f6',
                          color: '#374151'
                        }}>
                          {FEEDBACK_CATEGORY_LABELS[feedback.category]}
                        </span>
                      </div>

                      {/* User Info */}
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151', marginBottom: '5px' }}>
                        {feedback.username} ({feedback.role})
                      </div>

                      {/* Message Preview */}
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#6b7280', 
                        lineHeight: '1.4',
                        maxHeight: '40px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {feedback.initial_message}
                      </div>

                      {/* Time */}
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                        {formatRelativeTime(feedback.updated_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Frame>

          {/* Conversation Detail */}
          {selectedFeedback && (
            <Frame>
              <div style={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
                {/* Header */}
                <div style={{ padding: '15px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold' }}>
                        #{selectedFeedback.id} - {selectedFeedback.username}
                      </h3>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {selectedFeedback.email} • {selectedFeedback.page_title || selectedFeedback.page_url}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '5px' }}>
                        Created: {formatAbsoluteTime(selectedFeedback.created_at)}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFeedback(null)
                        setReplies([])
                      }}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ✕ Close
                    </button>
                  </div>

                  {/* Status & Priority Controls */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <select
                      value={selectedFeedback.status}
                      onChange={(e) => updateStatus(selectedFeedback.id, e.target.value as FeedbackStatus)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db',
                        fontSize: '12px',
                        backgroundColor: 'white'
                      }}
                    >
                      {Object.entries(FEEDBACK_STATUS_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                    <select
                      value={selectedFeedback.priority}
                      onChange={(e) => updatePriority(selectedFeedback.id, e.target.value as FeedbackPriority)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db',
                        fontSize: '12px',
                        backgroundColor: 'white'
                      }}
                    >
                      {Object.entries(FEEDBACK_PRIORITY_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Messages */}
                <div 
                  id="admin-feedback-messages"
                  style={{
                    flex: 1,
                    padding: '15px',
                    overflowY: 'auto',
                    backgroundColor: '#f9fafb',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {replies.map(reply => (
                    <div
                      key={reply.id}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: reply.sender_type === 'admin' ? '#dbeafe' : 'white',
                        border: '1px solid #e5e7eb',
                        maxWidth: '80%',
                        alignSelf: reply.sender_type === 'admin' ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>
                        {reply.sender_username} {reply.sender_type === 'admin' && '(You)'}
                      </div>
                      <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                        {reply.message}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        {formatRelativeTime(reply.created_at)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <div style={{ padding: '15px', borderTop: '1px solid #e5e7eb', backgroundColor: 'white' }}>
                  <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '10px' }}>
                    <textarea
                      placeholder="Type your reply..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        fontSize: '14px',
                        resize: 'vertical',
                        minHeight: '60px'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={sending || !replyMessage.trim()}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: sending || !replyMessage.trim() ? '#9ca3af' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: sending || !replyMessage.trim() ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {sending ? 'Sending...' : 'Send Reply'}
                    </button>
                  </form>
                </div>
              </div>
            </Frame>
          )}
        </div>
      </div>
    </Layout>
  )
}