import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../styles/status.css'

const DOC_LABELS = {
  registration:              'Organization Registration Document',
  activity_plan:             'Activity Plan',
  responsible_person_signoff: 'Responsible Person Signoff',
}

export default function ApplicantStatus() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [app, setApp]           = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const fetchStatus = async () => {
    // Fetch application row
    const { data: appData, error: appErr } = await supabase
      .from('grant_applications')
      .select('*')
      .eq('id', id)
      .single()

    if (appErr || !appData) {
      setError('Application not found. Please check your reference ID.')
      setLoading(false)
      return
    }

    // Fetch messages for this application (from the messages table)
    const { data: msgData } = await supabase
      .from('messages')
      .select('*')
      .eq('application_id', id)
      .eq('sender_type', 'foundation')
      .order('sent_at', { ascending: false })

    setApp(appData)
    setMessages(msgData || [])
    setLastRefresh(new Date())
    setLoading(false)
  }

  useEffect(() => {
    if (!id) return
    fetchStatus()
    // Poll every 20s so new messages appear live
    const interval = setInterval(fetchStatus, 20_000)
    return () => clearInterval(interval)
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── derived state ──────────────────────────────────────────────────────────
  const docs = app ? [
    { key: 'registration',              url: app.registration_url,              valid: app.registration_valid,    notes: app.registration_notes },
    { key: 'activity_plan',             url: app.activity_plan_url,             valid: app.activity_plan_valid,   notes: app.activity_plan_notes },
    { key: 'responsible_person_signoff', url: app.responsible_person_signoff_url, valid: app.signoff_valid,        notes: app.signoff_notes },
  ] : []

  const allValid   = docs.length > 0 && docs.every(d => d.url && d.valid)
  const pct        = docs.length > 0 ? Math.round(docs.filter(d => d.url && d.valid).length / docs.length * 100) : 0
  const completed  = docs.filter(d => d.url && d.valid).length

  const statusLabel = allValid ? 'Review Ready' : 'Under Review'
  const statusClass = allValid ? 'ready' : 'pending'

  // ── loading / error screens ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="status-container">
        <div className="status-loading">
          <div className="status-spinner" />
          <p>Loading your application…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="status-container">
        <div className="status-error-card">
          <div className="error-icon">⚠️</div>
          <h2>Application Not Found</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => navigate('/apply')}>
            Submit a New Application
          </button>
        </div>
      </div>
    )
  }

  // ── main render ────────────────────────────────────────────────────────────
  return (
    <div className="status-container">

      {/* Header */}
      <div className="status-header">
        <div className="status-header-left">
          <button className="back-link" onClick={() => navigate('/apply')}>
            ← Submit another application
          </button>
          <h1>Application Status</h1>
          <p>Track your grant application and view feedback from the review team</p>
        </div>
        <div className="status-header-right">
          <div className={`status-pill ${statusClass}`}>
            {allValid ? '✓' : '⏳'} {statusLabel}
          </div>
          {lastRefresh && (
            <span className="refresh-label">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Org info card */}
      <div className="status-card">
        <div className="status-org-row">
          <div>
            <h2 className="status-org-name">{app.organization_name}</h2>
            <p className="status-org-meta">
              Submitted by <strong>{app.applicant_name}</strong> · {new Date(app.submitted_at).toLocaleDateString()}
            </p>
          </div>
          <div className="status-ref">
            <span>Reference ID</span>
            <strong>{app.id.slice(0, 8).toUpperCase()}</strong>
          </div>
        </div>
      </div>

      <div className="status-two-col">

        {/* Left: document checklist */}
        <div className="status-card">
          <h3 className="status-section-title">Document Checklist</h3>

          {/* Progress bar */}
          <div className="status-progress-box">
            <div className="status-progress-bar">
              <div className="status-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="status-progress-text">
              <span>{completed} of {docs.length} documents accepted</span>
              <strong>{pct}%</strong>
            </div>
          </div>

          <div className="status-doc-list">
            {docs.map(doc => {
              let state = 'missing'
              if (doc.url && doc.valid)  state = 'accepted'
              else if (doc.url && !doc.valid) state = 'flagged'

              return (
                <div key={doc.key} className={`status-doc-item ${state}`}>
                  <div className="status-doc-icon">
                    {state === 'accepted' && '✓'}
                    {state === 'flagged'  && '⚠'}
                    {state === 'missing'  && '✗'}
                  </div>
                  <div className="status-doc-info">
                    <strong>{DOC_LABELS[doc.key]}</strong>
                    {state === 'accepted' && <span className="doc-state-label accepted">Accepted</span>}
                    {state === 'flagged'  && (
                      <>
                        <span className="doc-state-label flagged">Needs attention</span>
                        {doc.notes && <p className="doc-feedback-note">{doc.notes}</p>}
                      </>
                    )}
                    {state === 'missing'  && <span className="doc-state-label missing">Not submitted</span>}
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noreferrer" className="view-file-link">
                        View submitted file ↗
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {allValid && (
            <div className="status-all-done">
              <span>✓</span>
              <p>Your file is complete and ready for evaluation. The review team will be in touch.</p>
            </div>
          )}
        </div>

        {/* Right: messages from foundation */}
        <div className="status-card">
          <h3 className="status-section-title">
            Messages from the Foundation
            {messages.length > 0 && <span className="msg-count">{messages.length}</span>}
          </h3>

          {messages.length === 0 ? (
            <div className="no-messages">
              <div className="no-msg-icon">📭</div>
              <p>No messages yet.</p>
              <p className="no-msg-hint">
                If the review team needs additional information, their feedback will appear here.
                Check back later or refresh this page.
              </p>
              <button className="btn-refresh" onClick={fetchStatus}>
                ⟳ Check for new messages
              </button>
            </div>
          ) : (
            <div className="message-list">
              {messages.map(msg => (
                <div key={msg.id} className="message-item">
                  <div className="message-meta">
                    <span className="message-from">Foundation Review Team</span>
                    <span className="message-date">
                      {new Date(msg.sent_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="message-subject">{msg.subject}</div>
                  <pre className="message-body">{msg.body}</pre>
                  <div className="message-action-hint">
                    ↳ Please address the items above and resubmit your documents via the portal.
                  </div>
                  <button
                    className="btn-resubmit"
                    onClick={() => navigate('/resubmit')}
                  >
                    Resubmit Documents →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
