import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../styles/inbox.css'

export default function ApplicantInbox() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [application, setApplication] = useState(null)
  const [messages, setMessages] = useState([])
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [showCompose, setShowCompose] = useState(false)
  const [composeData, setComposeData] = useState({ subject: '', body: '' })
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const hasAutoSelected = useRef(false)

  async function fetchData() {
    try {
      // Fetch application
      const { data: appData, error: appError } = await supabase
        .from('grant_applications')
        .select('*')
        .eq('id', id)
        .single()

      if (appError) throw appError
      setApplication(appData)

      // Fetch messages - only show messages FROM foundation TO applicant
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('application_id', id)
        .eq('sender_type', 'foundation')  // Only show foundation messages
        .order('sent_at', { ascending: false })

      if (msgError) throw msgError
      setMessages(msgData || [])

      // Auto-select first message only on the very first load
      if (!hasAutoSelected.current && msgData && msgData.length > 0) {
        hasAutoSelected.current = true
        setSelectedMessage(msgData[0])
        // Mark it read without triggering a re-fetch
        supabase.from('messages').update({ read: true }).eq('id', msgData[0].id).then(() => {
          setMessages(prev => prev.map(m => m.id === msgData[0].id ? { ...m, read: true } : m))
        })
      }

      setLoading(false)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    
    fetchData()
    // Auto-refresh every 30 seconds (reduced frequency)
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function markAsRead(messageId) {
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId)
      
      // Update local state
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, read: true } : m
      ))
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  async function handleSelectMessage(message) {
    setSelectedMessage(message)
    if (!message.read) {
      await markAsRead(message.id)
    }
  }

  async function handleSendMessage() {
    const subject = composeData.subject.trim()
    const body = composeData.body.trim()
    
    if (!subject || !body) {
      alert('Please fill in both subject and message')
      return
    }
    
    if (subject.length > 200) {
      alert('Subject must be less than 200 characters')
      return
    }
    
    if (body.length > 10000) {
      alert('Message must be less than 10,000 characters')
      return
    }

    setSending(true)
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          application_id: id,
          sender_type: 'applicant',
          sender_name: application.applicant_name,
          subject: subject,
          body: body,
          read: false
        })

      if (error) throw error

      // Reset form
      setComposeData({ subject: '', body: '' })
      setShowCompose(false)
      
      // Refresh messages
      await fetchData()
      
      alert('✓ Message sent to foundation!')
    } catch (err) {
      console.error('Error sending message:', err)
      alert('Failed to send message: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  function handleReply() {
    setComposeData({
      subject: `Re: ${selectedMessage.subject}`,
      body: ''
    })
    setShowCompose(true)
  }

  const unreadCount = messages.filter(m => !m.read && m.sender_type === 'foundation').length
  
  const filteredMessages = messages.filter(m =>
    m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.body.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="inbox-loading">
        <div className="loading-spinner"></div>
        <p>Loading your inbox...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="inbox-error">
        <h2>⚠️ Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/apply')} className="btn-primary">
          Back to Portal
        </button>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="inbox-loading">
        <div className="loading-spinner"></div>
        <p>Loading application...</p>
      </div>
    )
  }

  return (
    <div className="inbox-container">
      {/* Header */}
      <div className="inbox-header">
        <div className="inbox-header-left">
          <h1>📧 Grant Application Inbox</h1>
          <p>{application.organization_name} - Ref #{application.reference_id || application.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="inbox-header-actions">
          <button 
            className="btn-compose"
            onClick={() => setShowCompose(!showCompose)}
          >
            ✏️ Compose
          </button>
          <button 
            className="btn-secondary"
            onClick={() => navigate(`/status/${id}`)}
          >
            📊 View Status
          </button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="inbox-layout">
        {/* Left Sidebar - Navigation */}
        <div className="inbox-sidebar">
          <div className="inbox-nav">
            <div className="inbox-nav-item active">
              <span className="nav-icon">📥</span>
              <span className="nav-label">Inbox</span>
              {unreadCount > 0 && (
                <span className="unread-badge">{unreadCount}</span>
              )}
            </div>
            <div className="inbox-nav-item">
              <span className="nav-icon">📤</span>
              <span className="nav-label">Sent</span>
            </div>
            <div className="inbox-nav-item">
              <span className="nav-icon">⭐</span>
              <span className="nav-label">Important</span>
            </div>
          </div>

          <div className="inbox-stats">
            <div className="stat-item">
              <strong>{messages.length}</strong>
              <span>Total Messages</span>
            </div>
            <div className="stat-item">
              <strong>{unreadCount}</strong>
              <span>Unread</span>
            </div>
          </div>
        </div>

        {/* Middle Panel - Message List */}
        <div className="inbox-list">
          <div className="inbox-list-header">
            <input
              type="text"
              placeholder="🔍 Search messages..."
              className="inbox-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button 
              className="btn-refresh"
              onClick={fetchData}
              title="Refresh messages"
              aria-label="Refresh messages"
            >
              🔄
            </button>
          </div>

          <div className="message-list-items">
            {filteredMessages.length === 0 ? (
              <div className="no-messages">
                <div className="no-msg-icon">📭</div>
                <p>No messages yet</p>
                <button 
                  className="btn-primary"
                  onClick={() => setShowCompose(true)}
                >
                  Send your first message
                </button>
              </div>
            ) : (
              filteredMessages.map(message => (
                <div
                  key={message.id}
                  className={`message-list-item ${selectedMessage?.id === message.id ? 'selected' : ''} ${!message.read && message.sender_type === 'foundation' ? 'unread' : ''}`}
                  onClick={() => handleSelectMessage(message)}
                >
                  <div className="message-item-header">
                    <span className="message-sender">
                      {message.sender_type === 'foundation' ? '🏛️ ' : '👤 '}
                      {message.sender_type === 'foundation' ? 'Schmitz-Stiftungen' : message.sender_name}
                    </span>
                    <span className="message-time">
                      {new Date(message.sent_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="message-item-subject">
                    {!message.read && message.sender_type === 'foundation' && (
                      <span className="unread-dot">•</span>
                    )}
                    {message.subject}
                  </div>
                  <div className="message-item-preview">
                    {message.body.substring(0, 80)}...
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Message Detail or Compose */}
        <div className="inbox-detail">
          {showCompose ? (
            <div className="compose-panel">
              <div className="compose-header">
                <h3>✏️ New Message</h3>
                <button 
                  className="btn-close"
                  onClick={() => setShowCompose(false)}
                >
                  ✕
                </button>
              </div>

              <div className="compose-form">
                <div className="form-group">
                  <label>To:</label>
                  <input 
                    type="text" 
                    value="Foundation Team"
                    disabled
                    className="compose-input"
                  />
                </div>

                <div className="form-group">
                  <label>Subject:</label>
                  <input
                    type="text"
                    placeholder="Enter subject"
                    value={composeData.subject}
                    onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                    className="compose-input"
                  />
                </div>

                <div className="form-group">
                  <label>Message:</label>
                  <textarea
                    placeholder="Type your message here..."
                    value={composeData.body}
                    onChange={(e) => setComposeData(prev => ({ ...prev, body: e.target.value }))}
                    className="compose-textarea"
                    rows={15}
                  />
                </div>

                <div className="compose-actions">
                  <button
                    className="btn-send"
                    onClick={handleSendMessage}
                    disabled={sending}
                  >
                    {sending ? 'Sending...' : '📤 Send Message'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowCompose(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : selectedMessage ? (
            <div className="message-detail">
              <div className="message-detail-header">
                <div className="message-detail-subject">
                  {selectedMessage.subject}
                </div>
                <button 
                  className="btn-reply"
                  onClick={handleReply}
                >
                  ↩️ Reply
                </button>
              </div>

              <div className="message-detail-meta">
                <div className="message-from">
                  <strong>From:</strong> {selectedMessage.sender_type === 'foundation' ? 'Schmitz-Stiftungen' : selectedMessage.sender_name}
                </div>
                <div className="message-date">
                  {new Date(selectedMessage.sent_at).toLocaleString()}
                </div>
              </div>

              <div className="message-detail-body">
                {selectedMessage.body.split('\n').map((line, i) => (
                  <p key={i}>{line || '\u00A0'}</p>
                ))}
              </div>

              {/* Resubmit button for evidence requests */}
              {selectedMessage.subject.includes('Evidence Request') && (
                <div className="message-action-bar">
                  <button
                    className="btn-resubmit"
                    onClick={() => navigate('/resubmit')}
                  >
                    📤 Resubmit Documents
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="no-selection">
              <div className="no-selection-icon">📧</div>
              <p>Select a message to read</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
