import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/inbox.css'

export default function FoundationInbox({ onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [messages, setMessages] = useState([])
  const [applications, setApplications] = useState({})
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [showCompose, setShowCompose] = useState(false)
  const [selectedApp, setSelectedApp] = useState(null)
  const [composeData, setComposeData] = useState({ subject: '', body: '', template: '' })
  const [templates, setTemplates] = useState([])
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all') // all, unread, from_applicants

  useEffect(() => {
    fetchData()
    // Auto-refresh every 20 seconds
    const interval = setInterval(fetchData, 20000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchData() {
    try {
      // Fetch all messages
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .order('sent_at', { ascending: false })

      if (msgError) throw msgError

      // Fetch all applications
      const { data: appData, error: appError } = await supabase
        .from('grant_applications')
        .select('*')

      if (appError) throw appError

      // Create application map for quick lookup
      const appMap = {}
      appData.forEach(app => {
        appMap[app.id] = app
      })

      setMessages(msgData || [])
      setApplications(appMap)
      
      // Fetch templates
      const { data: templateData } = await supabase
        .from('message_templates')
        .select('*')

      setTemplates(templateData || [])

      setLoading(false)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  async function handleSelectMessage(message) {
    setSelectedMessage(message)
    setShowCompose(false)
    
    // Mark as read if from applicant
    if (message.sender_type === 'applicant' && !message.read) {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', message.id)
      
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, read: true } : m
      ))
    }
  }

  function handleComposeNew(appId = null) {
    setShowCompose(true)
    setSelectedMessage(null)
    setSelectedApp(appId)
    setComposeData({ subject: '', body: '', template: '' })
  }

  function handleReply() {
    setShowCompose(true)
    setSelectedApp(selectedMessage.application_id)
    setComposeData({
      subject: `Re: ${selectedMessage.subject}`,
      body: '',
      template: ''
    })
  }

  function handleTemplateSelect(templateName) {
    const template = templates.find(t => t.name === templateName)
    if (!template) return

    const app = applications[selectedApp]
    if (!app) return

    // Replace placeholders
    let subject = template.subject
      .replace('{{ref_id}}', app.reference_id)
    
    let body = template.body
      .replace(/{{ref_id}}/g, app.reference_id)
      .replace(/{{applicant_name}}/g, app.applicant_name)
      .replace(/{{organization_name}}/g, app.organization_name)
      .replace(/{{amount}}/g, '$50,000')
      .replace(/{{next_steps}}/g, 'Grant agreement signing and disbursement')
      .replace(/{{document_list}}/g, '• Financial statements\n• Tax exemption certificate')
      .replace(/{{reason}}/g, 'Application did not meet current funding priorities')
      .replace(/{{question}}/g, 'Please clarify your project timeline')

    setComposeData({ subject, body, template: templateName })
  }

  async function handleSendMessage() {
    const subject = composeData.subject.trim()
    const body = composeData.body.trim()
    
    if (!subject || !body) {
      alert('Please fill in both subject and message')
      return
    }

    if (!selectedApp) {
      alert('Please select an application')
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
          application_id: selectedApp,
          sender_type: 'foundation',
          sender_name: 'Schmitz-Stiftungen',
          subject: subject,
          body: body,
          read: false
        })

      if (error) throw error

      // Reset form
      setComposeData({ subject: '', body: '', template: '' })
      setShowCompose(false)
      setSelectedApp(null)
      
      // Refresh messages
      await fetchData()
      
      alert('✓ Message sent to applicant!')
    } catch (err) {
      console.error('Error sending message:', err)
      alert('Failed to send message: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  // Filter messages
  const filteredMessages = messages.filter(m => {
    // Search filter
    const matchesSearch = m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         applications[m.application_id]?.organization_name.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false

    // Type filter
    if (filterType === 'unread') {
      return !m.read && m.sender_type === 'applicant'
    }
    if (filterType === 'from_applicants') {
      return m.sender_type === 'applicant'
    }
    return true
  })

  const unreadCount = messages.filter(m => !m.read && m.sender_type === 'applicant').length
  const applicantMessagesCount = messages.filter(m => m.sender_type === 'applicant').length

  if (loading) {
    return (
      <div className="inbox-loading">
        <div className="loading-spinner"></div>
        <p>Loading inbox...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="inbox-error">
        <h2>⚠️ Error Loading Inbox</h2>
        <p>{error}</p>
        <button onClick={fetchData} className="btn-primary">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="inbox-container foundation">
      {/* Header */}
      <div className="inbox-header">
        <div className="inbox-header-left">
          <h1>📬 Foundation Inbox</h1>
          <p>Manage all applicant communications</p>
        </div>
        <div className="inbox-header-actions">
          <button 
            className="btn-compose"
            onClick={() => handleComposeNew()}
          >
            ✏️ New Message
          </button>
          {onClose && (
            <button 
              className="btn-secondary"
              onClick={onClose}
            >
              ← Back to Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="inbox-layout">
        {/* Left Sidebar - Navigation */}
        <div className="inbox-sidebar">
          <div className="inbox-nav">
            <div 
              className={`inbox-nav-item ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              <span className="nav-icon">📥</span>
              <span className="nav-label">All Messages</span>
              <span className="count-badge">{messages.length}</span>
            </div>
            <div 
              className={`inbox-nav-item ${filterType === 'unread' ? 'active' : ''}`}
              onClick={() => setFilterType('unread')}
            >
              <span className="nav-icon">🔵</span>
              <span className="nav-label">Unread</span>
              {unreadCount > 0 && (
                <span className="unread-badge">{unreadCount}</span>
              )}
            </div>
            <div 
              className={`inbox-nav-item ${filterType === 'from_applicants' ? 'active' : ''}`}
              onClick={() => setFilterType('from_applicants')}
            >
              <span className="nav-icon">👥</span>
              <span className="nav-label">From Applicants</span>
              <span className="count-badge">{applicantMessagesCount}</span>
            </div>
          </div>

          <div className="inbox-stats">
            <div className="stat-item">
              <strong>{messages.length}</strong>
              <span>Total Messages</span>
            </div>
            <div className="stat-item">
              <strong>{unreadCount}</strong>
              <span>Need Reply</span>
            </div>
            <div className="stat-item">
              <strong>{Object.keys(applications).length}</strong>
              <span>Active Applications</span>
            </div>
          </div>
        </div>

        {/* Middle Panel - Message List */}
        <div className="inbox-list">
          <div className="inbox-list-header">
            <input
              type="text"
              placeholder="🔍 Search messages or organizations..."
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
                <p>No messages found</p>
              </div>
            ) : (
              filteredMessages.map(message => {
                const app = applications[message.application_id]
                return (
                  <div
                    key={message.id}
                    className={`message-list-item ${selectedMessage?.id === message.id ? 'selected' : ''} ${!message.read && message.sender_type === 'applicant' ? 'unread' : ''}`}
                    onClick={() => handleSelectMessage(message)}
                  >
                    <div className="message-item-header">
                      <span className="message-sender">
                        {message.sender_type === 'applicant' ? '👤 ' : '🏛️ '}
                        {app?.organization_name || 'Unknown'}
                      </span>
                      <span className="message-time">
                        {new Date(message.sent_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="message-item-subject">
                      {!message.read && message.sender_type === 'applicant' && (
                        <span className="unread-dot">•</span>
                      )}
                      {message.subject}
                    </div>
                    <div className="message-item-preview">
                      {app?.reference_id && <span className="message-ref">Ref #{app.reference_id}</span>}
                      {message.body.substring(0, 60)}...
                    </div>
                  </div>
                )
              })
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
                {/* Application selector */}
                <div className="form-group">
                  <label>To Application:</label>
                  <select
                    value={selectedApp || ''}
                    onChange={(e) => setSelectedApp(e.target.value)}
                    className="compose-input"
                  >
                    <option value="">Select an application...</option>
                    {Object.values(applications).map(app => (
                      <option key={app.id} value={app.id}>
                        {app.organization_name} - Ref #{app.reference_id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template selector */}
                {selectedApp && (
                  <div className="form-group">
                    <label>Use Template:</label>
                    <select
                      value={composeData.template}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                      className="compose-input"
                    >
                      <option value="">Custom message...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.name}>
                          {t.name.replace(/_/g, ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                    disabled={sending || !selectedApp}
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
                  <strong>From:</strong> {selectedMessage.sender_name}
                  {selectedMessage.sender_type === 'applicant' && ' (Applicant)'}
                </div>
                <div className="message-app-info">
                  <strong>Application:</strong> {applications[selectedMessage.application_id]?.organization_name || 'Unknown'} 
                  {applications[selectedMessage.application_id]?.reference_id && 
                    ` (Ref #${applications[selectedMessage.application_id].reference_id})`
                  }
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

              <div className="message-actions">
                <button 
                  className="btn-primary"
                  onClick={handleReply}
                >
                  ↩️ Reply to Message
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => handleComposeNew(selectedMessage.application_id)}
                >
                  ✏️ New Message to Applicant
                </button>
              </div>
            </div>
          ) : (
            <div className="no-selection">
              <div className="no-selection-icon">📧</div>
              <p>Select a message to read</p>
              <button 
                className="btn-primary"
                onClick={() => handleComposeNew()}
              >
                ✏️ Compose New Message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
