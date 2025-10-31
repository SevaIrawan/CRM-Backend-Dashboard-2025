'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StatCard from '@/components/StatCard'
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
  
  // Stats state
  const [stats, setStats] = useState({
    totalFeedbacks: 0,
    unreadFeedbacks: 0,
    openFeedbacks: 0,
    closedFeedbacks: 0
  })

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
      
      // Calculate stats
      const totalFeedbacks = feedbacksWithUnread.length
      const unreadFeedbacks = feedbacksWithUnread.filter(f => f.unread_count > 0).length
      const openFeedbacks = feedbacksWithUnread.filter(f => f.status === 'open').length
      const closedFeedbacks = feedbacksWithUnread.filter(f => f.status === 'closed').length
      
      setStats({
        totalFeedbacks,
        unreadFeedbacks,
        openFeedbacks,
        closedFeedbacks
      })
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

  // Create custom SubHeader with filters using standard project classes
  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        {/* Title area - left side */}
      </div>
      
      <div className="subheader-controls">
        <div className="slicer-group">
          <label className="slicer-label">STATUS:</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
            className="subheader-select"
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: 'white',
              fontSize: '14px',
              color: '#374151',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease',
              minWidth: '120px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <option value="all">All Status</option>
            {Object.entries(FEEDBACK_STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>

        <div className="slicer-group">
          <label className="slicer-label">PRIORITY:</label>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value as any })}
            className="subheader-select"
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: 'white',
              fontSize: '14px',
              color: '#374151',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease',
              minWidth: '120px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <option value="all">All Priority</option>
            {Object.entries(FEEDBACK_PRIORITY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>

        <div className="slicer-group">
          <label className="slicer-label">SEARCH:</label>
          <input
            type="text"
            placeholder="Search feedbacks..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: 'white',
              fontSize: '14px',
              color: '#374151',
              outline: 'none',
              transition: 'all 0.2s ease',
              minWidth: '150px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          />
        </div>
      </div>
    </div>
  )

  return (
    <Layout pageTitle="Feedback & Support" customSubHeader={customSubHeader}>
      <Frame variant="standard">
        {/* Content Container with proper spacing - NO SCROLL */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          marginTop: '18px',
          height: 'calc(100vh - 200px)',
          overflow: 'hidden'
        }}>
          {/* ROW 1: KPI CARDS (4 cards in 1 horizontal row) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px' }}>
            <StatCard
              title="TOTAL FEEDBACKS"
              value={stats.totalFeedbacks}
              icon="Total Feedbacks"
            />
            <StatCard
              title="UNREAD FEEDBACKS"
              value={stats.unreadFeedbacks}
              icon="Unread Feedbacks"
            />
            <StatCard
              title="OPEN FEEDBACKS"
              value={stats.openFeedbacks}
              icon="Open Feedbacks"
            />
            <StatCard
              title="CLOSED FEEDBACKS"
              value={stats.closedFeedbacks}
              icon="Closed Feedbacks"
            />
          </div>

          {/* Main Content - Split Layout */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '350px 1fr', 
            gap: '18px', 
            flex: 1,
            minHeight: 0
          }}>
          {/* Notifications List */}
          <Frame>
            <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>
                📬 Notifications ({feedbacks.length})
              </h3>
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Loading notifications...
                </div>
              ) : feedbacks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  No notifications found
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {feedbacks.map(feedback => (
                    <div
                      key={feedback.id}
                      onClick={() => {
                        setSelectedFeedback(feedback)
                        fetchReplies(feedback.id)
                      }}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: selectedFeedback?.id === feedback.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                        backgroundColor: selectedFeedback?.id === feedback.id ? '#eff6ff' : 'white',
                        cursor: 'pointer',
                        marginBottom: '12px',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                    >
                      {/* Unread Badge */}
                      {(feedback.unread_count || 0) > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          fontSize: '12px',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontWeight: 'bold'
                        }}>
                          {feedback.unread_count}
                        </div>
                      )}

                      {/* Header Tags */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span 
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: 'white',
                            backgroundColor: FEEDBACK_PRIORITY_CONFIG[feedback.priority].color
                          }}
                        >
                          {FEEDBACK_PRIORITY_CONFIG[feedback.priority].label}
                        </span>
                        <span 
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: 'white',
                            backgroundColor: FEEDBACK_STATUS_CONFIG[feedback.status].color
                          }}
                        >
                          {FEEDBACK_STATUS_CONFIG[feedback.status].label}
                        </span>
                      </div>

                      {/* User Info */}
                      <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#111827' }}>
                        {feedback.username} ({feedback.role})
                      </div>

                      {/* Message Preview */}
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {feedback.initial_message}
                      </div>

                      {/* Time */}
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
                        {formatRelativeTime(feedback.updated_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Frame>

          {/* Chat Box */}
          <Frame>
            <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {selectedFeedback ? (
                <>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>
                    💬 Chat with {selectedFeedback.username}
                  </h3>
                  <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'white' }}>
                    {/* Chat Header */}
                    <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                            #{selectedFeedback.id} - {selectedFeedback.username} ({selectedFeedback.role})
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {selectedFeedback.page_title || selectedFeedback.page_url}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedFeedback(null)
                            setReplies([])
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          ✕ Close
                        </button>
                      </div>

                      {/* Status & Priority Controls */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                          value={selectedFeedback.status}
                          onChange={(e) => updateStatus(selectedFeedback.id, e.target.value as FeedbackStatus)}
                          style={{
                            padding: '4px 8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
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
                            padding: '4px 8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
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
                      style={{ flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: '#f9fafb' }}
                    >
                      {replies.map(reply => (
                        <div
                          key={reply.id}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            maxWidth: '85%',
                            marginBottom: '8px',
                            backgroundColor: reply.sender_type === 'admin' ? '#3b82f6' : 'white',
                            color: reply.sender_type === 'admin' ? 'white' : '#111827',
                            border: reply.sender_type === 'user' ? '1px solid #e5e7eb' : 'none',
                            marginLeft: reply.sender_type === 'admin' ? 'auto' : '0'
                          }}
                        >
                          <div style={{ fontSize: '12px', opacity: 0.75, marginBottom: '4px' }}>
                            {reply.sender_username} {reply.sender_type === 'admin' && '(You)'}
                          </div>
                          <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                            {reply.message}
                          </div>
                          <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '4px' }}>
                            {formatRelativeTime(reply.created_at)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reply Form */}
                    <div style={{ padding: '12px', borderTop: '1px solid #e5e7eb', backgroundColor: 'white' }}>
                      <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '8px' }}>
                        <textarea
                          placeholder="Type your reply..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '14px',
                            resize: 'none',
                            minHeight: '60px'
                          }}
                          rows={2}
                        />
                        <button
                          type="submit"
                          disabled={sending || !replyMessage.trim()}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: sending || !replyMessage.trim() ? '#9ca3af' : '#3b82f6',
                            color: 'white',
                            fontSize: '14px',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: sending || !replyMessage.trim() ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {sending ? 'Sending...' : 'Send'}
                        </button>
                      </form>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%', 
                  color: '#6b7280',
                  fontSize: '16px',
                  textAlign: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
                    <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>Select a notification to start chat</div>
                    <div style={{ fontSize: '14px' }}>Choose from the notifications on the left to view and reply</div>
                  </div>
                </div>
              )}
            </div>
          </Frame>
          </div>

          {/* Slicer info removed as requested */}
        </div>
      </Frame>

      <style jsx>{`
      `}</style>
    </Layout>
  )
}