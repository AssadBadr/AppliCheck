import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import initialData from '../data/initial.json'
import '../App.css'

// ── Map a flat Supabase row → the shape the UI expects ─────────────────────
function rowToApp(row) {
  return {
    id: row.id.slice(0, 8).toUpperCase(),
    fullId: row.id,
    organizationName: row.organization_name,
    applicantName: row.applicant_name,
    contactEmail: row.contact_email,
    submittedDate: row.submitted_at,
    status: row.status,
    documents: {
      registration: {
        submitted: !!row.registration_url,
        valid: row.registration_valid ?? false,
        url: row.registration_url,
        notes: row.registration_notes || (row.registration_url ? '' : 'Document not provided'),
      },
      activityPlan: {
        submitted: !!row.activity_plan_url,
        valid: row.activity_plan_valid ?? false,
        url: row.activity_plan_url,
        notes: row.activity_plan_notes || (row.activity_plan_url ? '' : 'Document not provided'),
      },
      responsiblePersonSignoff: {
        submitted: !!row.responsible_person_signoff_url,
        valid: row.signoff_valid ?? false,
        url: row.responsible_person_signoff_url,
        notes: row.signoff_notes || (row.responsible_person_signoff_url ? '' : 'Document not provided'),
      },
    },
  }
}

const SUPABASE_READY =
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('replace_with')

// ── Realistic terminology map ───────────────────────────────────────────────
const DOC_META = {
  registration:             { label: 'Organisation Registration',     hint: 'Proof of legal registration status' },
  activityPlan:             { label: 'Activity Plan',                 hint: 'Detailed training activities and outcomes' },
  responsiblePersonSignoff: { label: 'Authorised Signatory Declaration', hint: 'Signed declaration from an authorised representative' },
}

export default function CaseworkerDashboard() {
  const navigate = useNavigate()

  const [applications, setApplications]     = useState([])
  const [selectedApp, setSelectedApp]       = useState(null)
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(null)
  const [usingDemo, setUsingDemo]           = useState(false)
  const [lastRefresh, setLastRefresh]       = useState(null)
  const [expandedDoc, setExpandedDoc]       = useState(null)
  // Track simulated resubmission
  const [simulating, setSimulating]         = useState(false)
  const [simulateDone, setSimulateDone]     = useState(false)
  // Email preview / sent state
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [emailSent, setEmailSent]               = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchApplications = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!SUPABASE_READY) {
      setApplications(initialData.applications)
      setUsingDemo(true)
      setLoading(false)
      setLastRefresh(new Date())
      return
    }

    const { data, error: fetchError } = await supabase
      .from('grant_applications')
      .select('*')
      .order('submitted_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setApplications(initialData.applications)
      setUsingDemo(true)
    } else {
      setApplications(data.length > 0 ? data.map(rowToApp) : initialData.applications)
      setUsingDemo(data.length === 0)
    }
    setLoading(false)
    setLastRefresh(new Date())
  }, [])

  useEffect(() => {
    fetchApplications()
    // Poll every 5s so resubmissions appear almost instantly
    const interval = setInterval(fetchApplications, 5_000)

    // Also subscribe to Supabase Realtime for instant updates
    const channel = SUPABASE_READY
      ? supabase
          .channel('grant_applications_changes')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'grant_applications' },
            (payload) => {
              fetchApplications()
              // If the currently open app was updated, refresh it too
              setSelectedApp(prev => {
                if (!prev || prev.fullId !== payload.new.id) return prev
                return rowToApp(payload.new)
              })
            }
          )
          .subscribe()
      : null

    return () => {
      clearInterval(interval)
      if (channel) supabase.removeChannel(channel)
    }
  }, [fetchApplications])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isReviewReady = (app) =>
    Object.values(app.documents).every(doc => doc.submitted && doc.valid)

  const getIssues = (app) => {
    const issues = []
    initialData.requiredDocuments.forEach(reqDoc => {
      const key =
        reqDoc.id === 'registration'             ? 'registration'
        : reqDoc.id === 'activityPlan'           ? 'activityPlan'
        : 'responsiblePersonSignoff'
      const doc = app.documents[key]
      if (!doc.submitted) {
        issues.push({ type: 'missing', key, label: DOC_META[key].label, detail: doc.notes })
      } else if (!doc.valid) {
        issues.push({ type: 'mismatch', key, label: DOC_META[key].label, detail: doc.notes })
      }
    })
    return issues
  }

  // Count docs that need attention
  const getStatusCounts = (app) => {
    let present = 0, mismatch = 0, missing = 0
    Object.values(app.documents).forEach(doc => {
      if (doc.submitted && doc.valid) present++
      else if (doc.submitted && !doc.valid) mismatch++
      else missing++
    })
    return { present, mismatch, missing }
  }

  // Build the consolidated applicant request (email body)
  const generateNotificationDraft = (app) => {
    const issues = getIssues(app)
    const missingItems  = issues.filter(i => i.type === 'missing')
    const mismatchItems = issues.filter(i => i.type === 'mismatch')

    let body = `Dear ${app.applicantName || app.organizationName},\n\n`
    body += `Thank you for submitting your application (Ref: ${app.id}).\n\n`
    body += `We have reviewed your dossier and need the following items to be addressed before we can proceed to the next stage of assessment.\n\n`
    body += `This is not a rejection — we simply need a complete and accurate evidence file.\n`
    body += `──────────────────────────────────────\n`

    if (missingItems.length > 0) {
      body += `\nMISSING DOCUMENTS\n`
      missingItems.forEach((item, i) => {
        body += `  ${i + 1}. ${item.label}\n`
        if (item.detail && item.detail !== 'Document not provided') {
          body += `     Note: ${item.detail}\n`
        }
      })
    }

    if (mismatchItems.length > 0) {
      body += `\nITEMS REQUIRING CORRECTION\n`
      mismatchItems.forEach((item, i) => {
        body += `  ${i + 1}. ${item.label}\n`
        if (item.detail) body += `     → ${item.detail}\n`
      })
    }

    body += `\n──────────────────────────────────────\n`
    body += `Please resubmit the corrected documents at your earliest convenience.\n\n`
    body += `If you have any questions about these requirements, please reply to this message.\n\n`
    body += `Kind regards,\nProgramme Review Team\n`

    return {
      to:      app.contactEmail,
      subject: `Evidence Request — Application ${app.id}`,
      body,
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectApp = (app) => {
    setSelectedApp(app)
    setShowEmailPreview(false)
    setExpandedDoc(null)
    setSimulateDone(false)
  }

  const handleToggleDoc = (key) => {
    setExpandedDoc(prev => prev === key ? null : key)
  }

  const handleSendNotification = async () => {
    if (!usingDemo && selectedApp?.fullId) {
      try {
        const draft = generateNotificationDraft(selectedApp)
        const { error } = await supabase.from('messages').insert({
          application_id: selectedApp.fullId,
          sender_type:    'foundation',
          sender_name:    'AppliCheck',
          subject:        draft.subject,
          body:           draft.body,
          read:           false,
        })
        if (error) throw error
      } catch (err) {
        console.error('Error sending notification:', err)
        alert('Could not send notification: ' + err.message)
        return
      }
    }
    setEmailSent(true)
    setTimeout(() => { setEmailSent(false); setShowEmailPreview(false) }, 3500)
  }

  // One-click simulate: marks the first invalid/missing doc as resubmitted & valid
  const handleSimulateResubmission = async () => {
    if (simulating) return
    setSimulating(true)

    const issues = getIssues(selectedApp)
    if (issues.length === 0) { setSimulating(false); return }

    const first = issues[0]
    const dbColMap = {
      registration:             'registration_valid',
      activityPlan:             'activity_plan_valid',
      responsiblePersonSignoff: 'signoff_valid',
    }
    const urlColMap = {
      registration:             'registration_url',
      activityPlan:             'activity_plan_url',
      responsiblePersonSignoff: 'responsible_person_signoff_url',
    }

    if (!usingDemo && selectedApp?.fullId) {
      try {
        const patch = {
          [dbColMap[first.key]]: true,
          [`${dbColMap[first.key].replace('_valid', '_notes')}`]: '',
          [urlColMap[first.key]]: 'https://via.placeholder.com/300x200.png?text=Resubmitted',
        }
        const { error } = await supabase
          .from('grant_applications')
          .update(patch)
          .eq('id', selectedApp.fullId)
        if (error) throw error
        await fetchApplications()
      } catch (err) {
        console.error('Simulation error:', err)
        alert('Simulation error: ' + err.message)
        setSimulating(false)
        return
      }
    } else {
      // Demo mode: update in-place locally
      setApplications(prev => prev.map(app => {
        if (app.id !== selectedApp.id) return app
        const updatedDocs = { ...app.documents }
        updatedDocs[first.key] = { ...updatedDocs[first.key], submitted: true, valid: true, notes: '', url: '#simulated' }
        const updated = { ...app, documents: updatedDocs }
        setSelectedApp(updated)
        return updated
      }))
    }

    setSimulateDone(true)
    setSimulating(false)
    setExpandedDoc(first.key)   // re-open that doc item so reviewer sees the change
  }

  const handleMarkValid = async (app, docKey, dbCol) => {
    // Always update local state immediately for instant feedback
    setApplications(prev => prev.map(a => {
      if (a.fullId !== app.fullId) return a
      const updatedDocuments = { ...a.documents }
      if (updatedDocuments[docKey]) {
        updatedDocuments[docKey] = { ...updatedDocuments[docKey], valid: true, notes: '' }
      }
      return { ...a, documents: updatedDocuments }
    }))
    setSelectedApp(prev => {
      if (!prev || prev.fullId !== app.fullId) return prev
      const updatedDocuments = { ...prev.documents }
      if (updatedDocuments[docKey]) {
        updatedDocuments[docKey] = { ...updatedDocuments[docKey], valid: true, notes: '' }
      }
      return { ...prev, documents: updatedDocuments }
    })

    // Also persist to Supabase if not demo
    if (!usingDemo) {
      try {
        const patch = { [dbCol]: true, [`${dbCol.replace('_valid', '_notes')}`]: '' }
        const { error } = await supabase
          .from('grant_applications')
          .update(patch)
          .eq('id', app.fullId)
        if (error) throw error
      } catch (err) {
        console.error('Error persisting to Supabase:', err)
      }
    }
  }

  const handleApproveApplication = async () => {
    if (usingDemo) {
      setApplications(prev => prev.map(a =>
        a.id === selectedApp.id ? { ...a, status: 'approved' } : a
      ))
      setSelectedApp(null)
      return
    }
    try {
      const { error: updateError } = await supabase
        .from('grant_applications')
        .update({ status: 'approved' })
        .eq('id', selectedApp.fullId)
      if (updateError) throw updateError

      // Non-blocking message
      supabase.from('messages').insert({
        application_id: selectedApp.fullId,
        sender_type:    'foundation',
        sender_name:    'AppliCheck',
        subject:        `Application Approved — Ref ${selectedApp.id}`,
        body: `Dear ${selectedApp.applicantName},\n\nYour grant application (Ref: ${selectedApp.id}) has been approved by the programme review committee.\n\nA member of our team will be in touch within 2–3 business days to discuss next steps.\n\nKind regards,\nAppliCheck`,
        read: false,
      }).then(({ error }) => { if (error) console.warn('Approval message failed:', error.message) })

      // Update local state immediately
      setApplications(prev => prev.map(a =>
        a.fullId === selectedApp.fullId ? { ...a, status: 'approved' } : a
      ))
      setSelectedApp(null)
      fetchApplications()
    } catch (err) {
      console.error('Error approving application:', err)
      alert('Error approving application: ' + err.message)
    }
  }

  const handleRejectApplication = async () => {
    if (usingDemo) {
      // Demo mode: update local state only
      setApplications(prev => prev.map(a =>
        a.id === selectedApp.id ? { ...a, status: 'rejected' } : a
      ))
      setSelectedApp(null)
      return
    }
    try {
      const { error: updateError } = await supabase
        .from('grant_applications')
        .update({ status: 'rejected' })
        .eq('id', selectedApp.fullId)
      if (updateError) throw updateError

      // Non-blocking — don't let message failure block the status update
      supabase.from('messages').insert({
        application_id: selectedApp.fullId,
        sender_type:    'foundation',
        sender_name:    'AppliCheck',
        subject:        `Application Outcome — Ref ${selectedApp.id}`,
        body: `Dear ${selectedApp.applicantName},\n\nThank you for submitting your application (Ref: ${selectedApp.id}).\n\nAfter careful review by our committee, we regret to inform you that your application has not been selected for funding in this cycle.\n\nWe encourage you to consider reapplying in the next funding round. Please don't hesitate to contact us if you have any questions.\n\nKind regards,\nAppliCheck`,
        read: false,
      }).then(({ error }) => { if (error) console.warn('Rejection message failed:', error.message) })

      // Update local state immediately — don't wait for re-fetch
      setApplications(prev => prev.map(a =>
        a.fullId === selectedApp.fullId ? { ...a, status: 'rejected' } : a
      ))
      setSelectedApp(null)
      // Also re-fetch in background to sync
      fetchApplications()
    } catch (err) {
      console.error('Error rejecting application:', err)
      alert('Error rejecting application: ' + err.message)
    }
  }

  const handleResetDemo = async () => {
    if (usingDemo) { fetchApplications(); return }

    const confirmReset = window.confirm(
      'This will delete ALL applications and restore only:\n• Learning Workshop A\n• Community Workshop B\n\nContinue?'
    )
    if (!confirmReset) return

    try {
      const { data: allApps, error: fetchError } = await supabase
        .from('grant_applications').select('id')
      if (fetchError) throw fetchError

      if (allApps && allApps.length > 0) {
        // Delete messages first (to avoid foreign key constraint issues)
        const { error: deleteMessagesError } = await supabase
          .from('messages').delete().in('application_id', allApps.map(a => a.id))
        if (deleteMessagesError) throw deleteMessagesError

        // Then delete applications
        const { error: deleteError } = await supabase
          .from('grant_applications').delete().in('id', allApps.map(a => a.id))
        if (deleteError) throw deleteError
      }

      // Insert the 2 default applications
      const { error: insertError } = await supabase
        .from('grant_applications')
        .insert([
          {
            organization_name: 'Learning Workshop A',
            applicant_name:    'Learning Workshop A',
            contact_email:     'contact@learningworkshopa.org',
            status:            'under_review',
            registration_url:  'https://via.placeholder.com/300x200.png?text=Registration',
            registration_valid: true,
            registration_notes: '',
            activity_plan_url:  'https://via.placeholder.com/300x200.png?text=Activity+Plan',
            activity_plan_valid: true,
            activity_plan_notes: '',
            responsible_person_signoff_url: null,
            signoff_valid: false,
            signoff_notes: 'Document not provided',
            submitted_at: new Date('2026-09-10T14:30:00Z').toISOString(),
          },
          {
            organization_name: 'Community Workshop B',
            applicant_name:    'Community Workshop B',
            contact_email:     'admin@communityworkshopb.org',
            status:            'under_review',
            registration_url:  'https://via.placeholder.com/300x200.png?text=Wrong+Name',
            registration_valid: false,
            registration_notes: "Name mismatch: document shows 'Community Workshop C' but application is for 'Community Workshop B'",
            activity_plan_url:  null,
            activity_plan_valid: false,
            activity_plan_notes: 'Document not provided',
            responsible_person_signoff_url: null,
            signoff_valid: false,
            signoff_notes: 'Document not provided',
            submitted_at: new Date('2026-09-12T09:15:00Z').toISOString(),
          },
        ])
      if (insertError) throw insertError

      setSelectedApp(null)
      setSimulateDone(false)
      await fetchApplications()
    } catch (err) {
      console.error('Reset error:', err)
      alert('Reset failed: ' + err.message)
    }
  }

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p>Loading application queue…</p>
        </div>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="app-container">

      {/* ── Header ── */}
      <header>
        <div>
          <div className="header-brand">
            {/* AppliCheck logo */}
            <div className="applicheck-logo">
              <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Blue accent page behind */}
                <rect x="8" y="14" width="32" height="40" rx="5" fill="#6b9eff" opacity="0.7"/>
                {/* Dark main document */}
                <rect x="16" y="8" width="34" height="44" rx="5" fill="#1e2b3c"/>
                {/* Folded corner */}
                <path d="M40 8 L50 18 L40 18 Z" fill="#6b9eff" opacity="0.85"/>
                <path d="M40 8 L50 18 L40 18 Z" fill="white" opacity="0.15"/>
                {/* Checkmark */}
                <path d="M25 32 L30 37 L40 26" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h1>Applicheck</h1>
            </div>
            <span className="gmail-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" strokeWidth="2" fill="none"/>
              </svg>
              Application Processing
            </span>
          </div>
          <p className="subtitle">
            AppliCheck · Grant Review Dashboard
          </p>
        </div>
        <div className="header-actions">
          {lastRefresh && (
            <span className="refresh-label">Updated {lastRefresh.toLocaleTimeString()}</span>
          )}
          <button className="refresh-btn" onClick={fetchApplications}>⟳ Refresh</button>
          <button className="btn-inbox" onClick={() => navigate('/foundation-inbox')}>📬 Inbox</button>
          <button className="btn-inbox" onClick={() => navigate('/apply')}>📝 Apply</button>
          <button className="reset-btn" onClick={handleResetDemo}>↺ Restart Demo</button>
        </div>
      </header>

      {/* ── Main grid ── */}
      <div className="main-content">

        {/* ── Application queue (sidebar) ── */}
        <aside className="applications-list">
          <div className="sidebar-header">
            <h2>Application Queue</h2>
            <span className="app-count">{applications.length}</span>
          </div>

          {error && (
            <div className="error-banner">⚠️ Could not connect — please check your connection</div>
          )}

          {applications.length === 0 ? (
            <div className="empty-sidebar">
              <div style={{ fontSize: '2.5rem', opacity: 0.25, marginBottom: '1rem' }}>📭</div>
              <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No applications in queue</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                New submissions will appear here automatically.
              </p>
            </div>
          ) : (
            applications.map(app => {
              const ready  = isReviewReady(app)
              const counts = getStatusCounts(app)
              return (
                <div
                  key={app.id}
                  className={`app-card ${selectedApp?.id === app.id ? 'selected' : ''} ${ready ? 'ready' : 'incomplete'}`}
                  onClick={() => handleSelectApp(app)}
                >
                  <div className="app-header">
                    <h3>{app.organizationName}</h3>
                    <span className={`status-badge ${app.status === 'rejected' ? 'rejected' : ready ? 'ready' : 'incomplete'}`}>
                      {app.status === 'rejected'
                        ? '✗ Not Approved'
                        : ready
                        ? '✓ Ready for review'
                        : `${counts.missing + counts.mismatch} item${counts.missing + counts.mismatch !== 1 ? 's' : ''} outstanding`
                      }
                    </span>
                  </div>
                  <div className="app-meta">
                    <span className="app-id">{app.id}</span>
                    <span>{new Date(app.submittedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  {/* Mini doc-status dots */}
                  <div className="app-doc-dots">
                    {Object.entries(app.documents).map(([key, doc]) => (
                      <span
                        key={key}
                        className={`doc-dot ${doc.submitted && doc.valid ? 'dot-ok' : doc.submitted ? 'dot-warn' : 'dot-miss'}`}
                        title={DOC_META[key]?.label}
                      />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </aside>

        {/* ── Dossier review panel ── */}
        <main className="application-details">
          {!selectedApp ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>Select an application from the queue to begin dossier review</p>
            </div>
          ) : (
            <>
              {/* Application header */}
              <div className="details-header">
                <div>
                  <h2>{selectedApp.organizationName}</h2>
                  <p className="app-id-display">
                    Ref: {selectedApp.id}
                    {selectedApp.applicantName && ` · ${selectedApp.applicantName}`}
                    {selectedApp.contactEmail && (
                      <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                        · {selectedApp.contactEmail}
                      </span>
                    )}
                  </p>

                </div>
                {isReviewReady(selectedApp) && (
                  <div className="ready-badge">
                    <span className="ready-icon">✓</span>
                    Dossier complete
                  </div>
                )}
              </div>

              {/* Evidence checklist */}
              <section className="document-checklist">
                <div className="checklist-header-section">
                  <h3>Evidence Checklist</h3>
                  <div className="completion-summary">
                    {(() => {
                      const total     = initialData.requiredDocuments.length
                      const completed = initialData.requiredDocuments.filter(reqDoc => {
                        const key = reqDoc.id === 'activityPlan'           ? 'activityPlan'
                                  : reqDoc.id === 'responsiblePersonSignoff' ? 'responsiblePersonSignoff'
                                  : 'registration'
                        return selectedApp.documents[key]?.submitted && selectedApp.documents[key]?.valid
                      }).length
                      const pct = Math.round((completed / total) * 100)
                      return (
                        <>
                          <div className="completion-bar">
                            <div className="completion-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="completion-text">
                            <span className="completion-count">{completed} of {total} evidence items accepted</span>
                            <span className="completion-percent">{pct}%</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* Document rows — click to expand source evidence */}
                {initialData.requiredDocuments.map(reqDoc => {
                  const key = reqDoc.id === 'activityPlan'           ? 'activityPlan'
                            : reqDoc.id === 'responsiblePersonSignoff' ? 'responsiblePersonSignoff'
                            : 'registration'
                  const doc       = selectedApp.documents[key]
                  const dbColMap  = { registration: 'registration_valid', activityPlan: 'activity_plan_valid', responsiblePersonSignoff: 'signoff_valid' }
                  const meta      = DOC_META[key]
                  const isExpanded = expandedDoc === key

                  let status = 'missing'
                  if (doc.submitted && doc.valid)  status = 'present'
                  else if (doc.submitted && !doc.valid) status = 'mismatch'

                  return (
                    <div key={reqDoc.id} className={`doc-item status-${status} ${isExpanded ? 'doc-expanded' : ''}`}>
                      {/* Clickable row header */}
                      <div
                        className="doc-row-header"
                        onClick={() => handleToggleDoc(key)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && handleToggleDoc(key)}
                        aria-expanded={isExpanded}
                      >
                        <div className="doc-status">
                          <span className="icon">
                            {status === 'present'  && '✓'}
                            {status === 'mismatch' && '⚠'}
                            {status === 'missing'  && '✗'}
                          </span>
                        </div>
                        <div className="doc-info" style={{ flex: 1 }}>
                          <div className="doc-title-row">
                            <h4>{meta.label}</h4>
                            <span className="doc-expand-icon">{isExpanded ? '▲' : '▼'}</span>
                          </div>
                          <p className="doc-description">{meta.hint}</p>
                          {status === 'mismatch' && doc.notes && (
                            <p className="doc-notes">{doc.notes}</p>
                          )}
                          {status === 'missing' && (
                            <p className="doc-notes doc-notes-missing">No document submitted</p>
                          )}
                        </div>
                      </div>

                      {/* Expanded: source evidence panel */}
                      {isExpanded && (
                        <div className="doc-evidence-panel">
                          {doc.url ? (
                            <div className="doc-evidence-content">
                              <div className="doc-evidence-header">
                                <span className="evidence-label">📎 Submitted evidence</span>
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="view-doc-link"
                                >
                                  Open source document ↗
                                </a>
                              </div>
                              <div className="doc-preview-frame">
                                <img
                                  src={doc.url}
                                  alt={`Submitted: ${meta.label}`}
                                  className="doc-preview-img"
                                  onError={e => { e.target.style.display = 'none' }}
                                />
                                <p className="doc-preview-fallback">
                                  {doc.url === '#simulated' ? '✓ Document accepted' : 'Preview not available — use "Open source document" to view'}
                                </p>
                              </div>
                              {/* Auto-verification status — no manual accept needed */}
                              <div className="doc-auto-status">
                                {doc.valid ? (
                                  <span className="auto-status-ok">✓ Automatically verified by AppliCheck</span>
                                ) : (
                                  <span className="auto-status-fail">⚠ Issue detected automatically — notify applicant below</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="doc-evidence-empty">
                              <span>No document submitted for this item.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </section>

              {/* ── Actions: outstanding items ── */}
              {!isReviewReady(selectedApp) && (
                <section className="actions">
                  <div className="auto-notify-status">
                    <span className="auto-notify-icon">⚡</span>
                    <div>
                      <strong>Evidence request sent automatically</strong>
                      <p>AppliCheck detected missing or invalid documents and notified the applicant via their inbox.</p>
                    </div>
                    <button className="btn-view-inbox" onClick={() => navigate('/foundation-inbox')}>
                      View inbox →
                    </button>
                  </div>
                </section>
              )}

              {/* ── Success state: dossier complete ── */}
              {isReviewReady(selectedApp) && (
                <section className="success-state">
                  <div className="success-icon">✓</div>
                  <h3>Dossier Complete</h3>
                  <p>All required evidence items are present and accepted.</p>
                  <p>This application is ready for committee review.</p>
                  <p className="next-step">Make your assessment decision below.</p>

                  <div className="decision-actions">
                    <button className="btn-approve" onClick={handleApproveApplication}>
                      ✓ Approve application
                    </button>
                  </div>
                  <p className="decision-note">Decisions are final. A notification will be sent to the applicant.</p>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
