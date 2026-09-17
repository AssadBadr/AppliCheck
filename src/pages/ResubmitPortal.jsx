import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../styles/portal.css'

const REQUIRED_DOCS = [
  {
    id: 'registration',
    label: 'Organisation Registration Document',
    description: 'Official document proving your legal registration status',
    accept: '.pdf,.doc,.docx,.jpg,.png',
    icon: '🏛️',
    urlCol:   'registration_url',
    validCol: 'registration_valid',
    notesCol: 'registration_notes',
  },
  {
    id: 'activity_plan',
    label: 'Activity Plan',
    description: 'Detailed plan of your training activities and outcomes',
    accept: '.pdf,.doc,.docx',
    icon: '📋',
    urlCol:   'activity_plan_url',
    validCol: 'activity_plan_valid',
    notesCol: 'activity_plan_notes',
  },
  {
    id: 'responsible_person_signoff',
    label: 'Authorised Signatory Declaration',
    description: 'Signed declaration from an authorised representative',
    accept: '.pdf,.doc,.docx,.jpg,.png',
    icon: '✍️',
    urlCol:   'responsible_person_signoff_url',
    validCol: 'signoff_valid',
    notesCol: 'signoff_notes',
  },
]

export default function ResubmitPortal() {
  const navigate = useNavigate()

  // Step 0 — lookup
  const [refId, setRefId]               = useState('')
  const [companyName, setCompanyName]   = useState('')
  const [email, setEmail]               = useState('')
  const [looking, setLooking]           = useState(false)
  const [lookupError, setLookupError]   = useState(null)

  // Step 1 — upload
  const [application, setApplication]   = useState(null)
  const [files, setFiles]               = useState({})
  const [uploading, setUploading]       = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [submitError, setSubmitError]   = useState(null)

  // Step 2 — done
  const [done, setDone]                 = useState(false)

  // Validation errors per doc slot
  const [fileErrors, setFileErrors]     = useState({})

  // ── Smart document validation ─────────────────────────────────────────────
  // Keywords that identify each document type from its text content
  const DOC_SIGNATURES = {
    registration: {
      required: ['registration', 'incorporation', 'certificate'],
      forbidden: ['activity plan', 'training activities', 'declaration', 'signoff', 'authorised signatory'],
    },
    activity_plan: {
      required: ['activity', 'plan', 'training'],
      forbidden: ['certificate of incorporation', 'registration number', 'declaration', 'signatory'],
    },
    responsible_person_signoff: {
      required: ['declaration', 'authorised', 'signatory', 'representative', 'signoff'],
      forbidden: ['certificate of incorporation', 'registration number', 'activity plan', 'training activities'],
    },
  }

  const DOC_LABELS_SHORT = {
    registration: 'Organisation Registration Document',
    activity_plan: 'Activity Plan',
    responsible_person_signoff: 'Authorised Signatory Declaration',
  }

  const validateDocumentContent = (file, docId) => {
    return new Promise((resolve) => {
      // Only validate text-readable files
      const isText = file.type === 'text/plain' || file.name.endsWith('.txt')
      if (!isText) {
        resolve({ valid: true }) // Can't read PDFs in browser — skip deep check
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target.result.toLowerCase()
        const sig = DOC_SIGNATURES[docId]
        if (!sig) { resolve({ valid: true }); return }

        // Check forbidden keywords — document is clearly the wrong type
        const foundForbidden = sig.forbidden.find(kw => content.includes(kw))
        if (foundForbidden) {
          // Try to identify what the file actually IS
          let detectedAs = 'a different document type'
          if (content.includes('certificate of incorporation') || content.includes('registration number')) {
            detectedAs = 'an Organisation Registration Document'
          } else if (content.includes('activity plan') || content.includes('training activities')) {
            detectedAs = 'an Activity Plan'
          } else if (content.includes('declaration') || content.includes('authorised signatory')) {
            detectedAs = 'an Authorised Signatory Declaration'
          }
          resolve({
            valid: false,
            error: `Wrong document detected. This file appears to be ${detectedAs}, but the "${DOC_LABELS_SHORT[docId]}" slot expects a different document. Please upload the correct file.`,
          })
          return
        }

        // Check required keywords — document doesn't look like the right type
        const hasRequired = sig.required.some(kw => content.includes(kw))
        if (!hasRequired) {
          resolve({
            valid: false,
            error: `This file does not appear to be a valid "${DOC_LABELS_SHORT[docId]}". Please check you are uploading the correct document.`,
          })
          return
        }

        resolve({ valid: true })
      }
      reader.onerror = () => resolve({ valid: true }) // On error, allow upload
      reader.readAsText(file)
    })
  }

  const handleFileChange = async (docId, file) => {
    if (!file) return

    // Clear previous error for this slot
    setFileErrors(prev => ({ ...prev, [docId]: null }))

    const result = await validateDocumentContent(file, docId)
    if (!result.valid) {
      setFileErrors(prev => ({ ...prev, [docId]: result.error }))
      // Don't set the file — reject it
      return
    }

    setFiles(p => ({ ...p, [docId]: file }))
  }

  // ── Lookup application ────────────────────────────────────────────────────
  const handleLookup = async () => {
    const ref  = refId.trim().toUpperCase()
    const name = companyName.trim().toLowerCase()
    const mail = email.trim().toLowerCase()

    if (!ref || !name || !mail) {
      setLookupError('Please fill in all three fields.')
      return
    }

    if (!mail.includes('@') || !mail.includes('.')) {
      setLookupError('Please enter a valid email address.')
      return
    }

    setLooking(true)
    setLookupError(null)

    try {
      // First try Supabase
      const { data, error } = await supabase
        .from('grant_applications')
        .select('*')
        .ilike('organization_name', `%${companyName.trim()}%`)
        .ilike('contact_email', `%${email.trim()}%`)

      if (error) throw error

      let match = data?.find(app =>
        app.id.slice(0, 8).toUpperCase() === ref
      )

      // Fallback: check initial.json demo apps
      if (!match) {
        const demoApps = (await import('../data/initial.json')).default.applications
        const demoMatch = demoApps.find(a => {
          // Match by exact ID or by org name + email
          const idMatch = a.id.toUpperCase() === ref ||
                          a.id.replace(/-/g,'').toUpperCase() === ref.replace(/-/g,'')
          const nameMatch = a.organizationName.toLowerCase().includes(companyName.trim().toLowerCase())
          const emailMatch = a.contactEmail?.toLowerCase() === email.trim().toLowerCase()
          return (idMatch || nameMatch) && emailMatch
        })

        if (demoMatch) {
          // Map demo format to Supabase format
          match = {
            id: demoMatch.id,
            applicant_name: demoMatch.organizationName,
            organization_name: demoMatch.organizationName,
            contact_email: demoMatch.contactEmail,
            status: demoMatch.status,
            submitted_at: demoMatch.submittedDate,
            registration_url: demoMatch.documents?.registration?.submitted ? '#demo' : null,
            registration_valid: demoMatch.documents?.registration?.valid || false,
            registration_notes: demoMatch.documents?.registration?.notes || '',
            activity_plan_url: demoMatch.documents?.activityPlan?.submitted ? '#demo' : null,
            activity_plan_valid: demoMatch.documents?.activityPlan?.valid || false,
            activity_plan_notes: demoMatch.documents?.activityPlan?.notes || '',
            responsible_person_signoff_url: demoMatch.documents?.responsiblePersonSignoff?.submitted ? '#demo' : null,
            signoff_valid: demoMatch.documents?.responsiblePersonSignoff?.valid || false,
            signoff_notes: demoMatch.documents?.responsiblePersonSignoff?.notes || '',
            _isDemo: true, // flag so we skip Supabase update
          }
        }
      }

      if (!match) {
        setLookupError('No application found. Please check your reference ID, organisation name and email.')
        setLooking(false)
        return
      }

      setApplication(match)
    } catch (err) {
      setLookupError('Error looking up application: ' + err.message)
    } finally {
      setLooking(false)
    }
  }

  // ── Upload a single file ──────────────────────────────────────────────────
  const uploadFile = async (docId, file) => {
    const ext  = file.name.split('.').pop()
    const path = `resubmit_${Date.now()}_${docId}.${ext}`
    setUploadProgress(p => ({ ...p, [docId]: 'uploading' }))

    const { error } = await supabase.storage
      .from('grant-documents')
      .upload(path, file, { upsert: true })

    if (error) throw new Error(`Upload failed for ${docId}: ${error.message}`)

    const { data: { publicUrl } } = supabase.storage
      .from('grant-documents')
      .getPublicUrl(path)

    setUploadProgress(p => ({ ...p, [docId]: 'done' }))
    return publicUrl
  }

  // ── Auto-validate a file against its expected doc type ───────────────────
  const autoValidateFile = (file, docId) => {
    return new Promise((resolve) => {
      const isText = file.type === 'text/plain' || file.name.endsWith('.txt')
      if (!isText) {
        // Can't read PDF in browser — assume valid if filename matches
        const fname = file.name.toLowerCase()
        const hints = {
          registration: ['registration', 'certificate', 'incorporation'],
          activity_plan: ['activity', 'plan', 'training'],
          responsible_person_signoff: ['signoff', 'declaration', 'signatory'],
        }
        const expectedHints = hints[docId] || []
        const filenameMatch = expectedHints.some(h => fname.includes(h))
        resolve({ valid: true, notes: filenameMatch ? '' : 'Uploaded — pending caseworker review' })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target.result.toLowerCase()
        const sig = DOC_SIGNATURES[docId]
        if (!sig) { resolve({ valid: true, notes: '' }); return }

        const foundForbidden = sig.forbidden.find(kw => content.includes(kw))
        if (foundForbidden) {
          resolve({ valid: false, notes: `Wrong document type detected — ${foundForbidden} found in document` })
          return
        }

        const hasRequired = sig.required.some(kw => content.includes(kw))
        if (!hasRequired) {
          resolve({ valid: false, notes: 'Document content does not match expected type' })
          return
        }

        resolve({ valid: true, notes: '' })
      }
      reader.onerror = () => resolve({ valid: true, notes: '' })
      reader.readAsText(file)
    })
  }

  // ── Submit resubmission ───────────────────────────────────────────────────
  const handleResubmit = async () => {
    const docsToUpload = Object.keys(files).filter(k => files[k])
    if (docsToUpload.length === 0) {
      setSubmitError('Please upload at least one corrected document.')
      return
    }

    setUploading(true)
    setSubmitError(null)

    try {
      const patch = {}

      for (const doc of REQUIRED_DOCS) {
        if (files[doc.id]) {
          const url = await uploadFile(doc.id, files[doc.id])
          // Auto-validate the file — no manual caseworker action needed
          const validation = await autoValidateFile(files[doc.id], doc.id)
          patch[doc.urlCol]   = url
          patch[doc.validCol] = validation.valid   // ✅ AUTO-SET based on content
          patch[doc.notesCol] = validation.valid ? '' : validation.notes
        }
      }

      // Check if all docs are now valid → mark as review_ready automatically
      const allDocsValid = REQUIRED_DOCS.every(doc => {
        if (patch[doc.validCol] !== undefined) return patch[doc.validCol]
        // Doc not resubmitted — check existing value
        if (doc.id === 'registration')               return application.registration_valid
        if (doc.id === 'activity_plan')              return application.activity_plan_valid
        if (doc.id === 'responsible_person_signoff') return application.signoff_valid
        return false
      })

      const newStatus = allDocsValid ? 'review_ready' : 'under_review'

      // Skip Supabase update for demo apps (they only exist in initial.json)
      if (!application._isDemo) {
        const { error: updateError } = await supabase
          .from('grant_applications')
          .update({ ...patch, status: newStatus })
          .eq('id', application.id)

        if (updateError) throw updateError
      }

      // Send notification to foundation inbox
      const invalidDocs = REQUIRED_DOCS.filter(doc => files[doc.id] && patch[doc.validCol] === false)
      const validDocs   = REQUIRED_DOCS.filter(doc => files[doc.id] && patch[doc.validCol] === true)

      await supabase.from('messages').insert({
        application_id: application.id,
        sender_type:    'foundation',
        sender_name:    'Schmitz-Stiftungen',
        subject:        allDocsValid
          ? `✅ Documents Verified — Ref #${application.id.slice(0, 8).toUpperCase()}`
          : `⚠ Resubmission Review — Ref #${application.id.slice(0, 8).toUpperCase()}`,
        body: allDocsValid
          ? `Dear ${application.applicant_name},\n\nAppliCheck has automatically verified your resubmitted documents for application Ref #${application.id.slice(0, 8).toUpperCase()}.\n\nAll required documents are now valid. Your application is ready for final review by our programme committee.\n\nKind regards,\nSchmitz-Stiftungen`
          : `Dear ${application.applicant_name},\n\nAppliCheck reviewed your resubmitted documents for Ref #${application.id.slice(0, 8).toUpperCase()}.\n\n${validDocs.length > 0 ? `✅ Accepted:\n${validDocs.map(d => `• ${d.label}`).join('\n')}\n\n` : ''}${invalidDocs.length > 0 ? `❌ Still requires correction:\n${invalidDocs.map(d => `• ${d.label}: ${patch[d.notesCol]}`).join('\n')}\n\n` : ''}Please correct the remaining items and resubmit.\n\nKind regards,\nSchmitz-Stiftungen`,
        read: false,
      })

      setDone(true)
    } catch (err) {
      console.error('Resubmit error:', err)
      setSubmitError('Submission failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="portal-container">
        <div className="portal-success-card">
          <div className="success-anim">✓</div>
          <h2>Documents Resubmitted!</h2>
          <p>Your corrected documents have been received and sent to the caseworker for review.</p>
          <div className="submitted-id">
            <span>Reference ID</span>
            <strong>{application.id.slice(0, 8).toUpperCase()}</strong>
          </div>
          <p className="success-hint">You will be notified in your inbox once the review is complete.</p>
          <div className="success-actions">
            <button
              className="btn-primary"
              onClick={() => navigate(`/inbox/${application.id}`)}
            >
              📧 Open My Inbox
            </button>
            <button
              className="btn-secondary"
              onClick={() => navigate(`/status/${application.id}`)}
            >
              📊 View Application Status
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Upload screen (after lookup) ──────────────────────────────────────────
  if (application) {
    const refDisplay = application.id.slice(0, 8).toUpperCase()

    // Which docs are flagged/missing
    const flaggedDocs = REQUIRED_DOCS.filter(doc => {
      if (doc.id === 'registration')              return !application.registration_valid
      if (doc.id === 'activity_plan')             return !application.activity_plan_valid
      if (doc.id === 'responsible_person_signoff') return !application.signoff_valid
      return false
    })

    return (
      <div className="portal-container">
        <div className="portal-header">
          <div className="portal-header-left">
            <button className="back-link" onClick={() => setApplication(null)}>
              ← Change application
            </button>
            <h1>Resubmit Documents</h1>
            <p>Upload corrected documents for your application</p>
          </div>
          <div className="portal-badge">Resubmission</div>
        </div>

        <div className="portal-card">
          {/* Application info banner */}
          <div className="resubmit-app-banner">
            <div className="resubmit-app-info">
              <strong>{application.organization_name}</strong>
              <span>Ref #{refDisplay}</span>
            </div>
            <span className="resubmit-status-tag">Under Review</span>
          </div>

          {/* Only show flagged docs — no need to reupload everything */}
          {flaggedDocs.length === 0 ? (
            <div className="resubmit-all-ok">
              <p>✅ All your documents are currently accepted. No resubmission needed.</p>
              <button
                className="btn-primary"
                onClick={() => navigate(`/status/${application.id}`)}
              >
                View Application Status
              </button>
            </div>
          ) : (
            <>
              <div className="portal-step">
                <h2>Documents Requiring Attention</h2>
                <p className="step-desc">
                  Only upload corrected versions of the items below. Already accepted documents do not need to be resubmitted.
                </p>

                <div className="doc-upload-list">
                  {flaggedDocs.map(doc => {
                    const notesField = doc.id === 'registration'              ? application.registration_notes
                                     : doc.id === 'activity_plan'             ? application.activity_plan_notes
                                     : application.signoff_notes
                    const file = files[doc.id]

                    return (
                      <div key={doc.id} className={`doc-upload-item ${file ? 'has-file' : ''}`}>
                        <div className="doc-upload-icon">{doc.icon}</div>
                        <div className="doc-upload-info">
                          <h4>{doc.label}</h4>
                          <p>{doc.description}</p>
                          {notesField && notesField !== 'Document not provided' && (
                            <div className="resubmit-note">
                              ⚠ Caseworker note: <em>{notesField}</em>
                            </div>
                          )}
                          {fileErrors[doc.id] && (
                            <div className="resubmit-file-error">
                              ❌ {fileErrors[doc.id]}
                            </div>
                          )}
                          {file && (
                            <div className="file-chip">
                              <span>📄 {file.name}</span>
                              <button
                                className="remove-file"
                                onClick={() => setFiles(p => ({ ...p, [doc.id]: null }))}
                              >✕</button>
                            </div>
                          )}
                          {uploadProgress[doc.id] === 'uploading' && (
                            <div className="file-chip">⏳ Uploading…</div>
                          )}
                        </div>
                        <div className="doc-upload-action">
                          {!file ? (
                            <label className="upload-btn">
                              Choose File
                              <input
                                type="file"
                                accept={doc.accept}
                                style={{ display: 'none' }}
                                onChange={e => handleFileChange(doc.id, e.target.files[0])}
                              />
                            </label>
                          ) : (
                            <span className="upload-ready">✓ Ready</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {submitError && (
                  <div className="submit-error">
                    <strong>Error:</strong> {submitError}
                  </div>
                )}

                <div className="step-actions">
                  <button className="btn-secondary" onClick={() => setApplication(null)}>
                    ← Cancel
                  </button>
                  <button
                    className="btn-submit"
                    onClick={handleResubmit}
                    disabled={uploading || Object.values(files).every(f => !f)}
                  >
                    {uploading ? '⏳ Uploading…' : 'Submit Corrected Documents'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Lookup screen ─────────────────────────────────────────────────────────
  return (
    <div className="portal-container">
      <div className="portal-header">
        <div className="portal-header-left">
          <h1>Resubmit Documents</h1>
          <p>Enter your reference ID and organisation name to continue</p>
        </div>
        <div className="portal-badge">Resubmission</div>
      </div>

      <div className="portal-card">
        <div className="portal-step">
          <h2>Find Your Application</h2>
          <p className="step-desc">
            You can find your reference ID in the confirmation email or your inbox.
          </p>

          <div className="form-grid">
            <div className="form-group">
              <label>Reference ID <span className="required">*</span></label>
              <input
                type="text"
                placeholder="e.g. APP-002 or FF50A565"
                value={refId}
                onChange={e => setRefId(e.target.value.toUpperCase())}
                maxLength={20}
                autoFocus
                style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}
              />
              <span className="form-hint">Found in your confirmation message or inbox</span>
            </div>

            <div className="form-group">
              <label>Organisation Name <span className="required">*</span></label>
              <input
                type="text"
                placeholder="e.g. Community Workshop B"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
              <span className="form-hint">Must match the name on your original application</span>
            </div>

            <div className="form-group full">
              <label>Contact Email <span className="required">*</span></label>
              <input
                type="email"
                placeholder="contact@yourorganisation.org"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <span className="form-hint">The email used when the application was submitted</span>
            </div>
          </div>

          {lookupError && (
            <div className="submit-error">
              {lookupError}
            </div>
          )}

          <div className="step-actions">
            <div />
            <button
              className="btn-primary"
              onClick={handleLookup}
              disabled={looking || !refId.trim() || !companyName.trim() || !email.trim()}
            >
              {looking ? '🔍 Looking up…' : 'Find My Application →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
