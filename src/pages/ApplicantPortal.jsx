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
    description: 'Detailed plan of your training activities and expected outcomes',
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

const STEPS = ['Organisation', 'Documents', 'Review & Submit']

// Keywords for document type detection (text files only)
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

const DOC_TYPE_LABELS = {
  registration: 'Organisation Registration Document',
  activity_plan: 'Activity Plan',
  responsible_person_signoff: 'Authorised Signatory Declaration',
}

export default function ApplicantPortal() {
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const [submittedId, setSubmittedId] = useState(null)

  // Step 0 fields
  const [applicantName, setApplicantName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  // duplicate-application state
  const [duplicateApp, setDuplicateApp] = useState(null)
  const [existingApp, setExistingApp]   = useState(null)
  const [uploadProgress, setUploadProgress] = useState({})
  const [files, setFiles] = useState({ registration: null, activity_plan: null, responsible_person_signoff: null })
  const [validating, setValidating] = useState({})
  const [fileErrors, setFileErrors] = useState({})

  // ── Document type validation (upload-time) ──────────────────────────────
  const validateDocumentType = async (file, expectedType) => {
    const fname = file.name.toLowerCase()
    const isText = file.type === 'text/plain' || file.name.endsWith('.txt')

    // Filename-based cross-slot detection (works for all file types)
    const FILENAME_HINTS = {
      registration: ['registration', 'certificate', 'incorporation'],
      activity_plan: ['activity', 'plan', 'training', 'curriculum'],
      responsible_person_signoff: ['signoff', 'sign-off', 'declaration', 'signatory', 'authorization', 'authoris'],
    }

    // If filename strongly suggests a DIFFERENT slot, reject immediately
    for (const [otherType, hints] of Object.entries(FILENAME_HINTS)) {
      if (otherType !== expectedType && hints.some(h => fname.includes(h))) {
        // Also make sure the expected slot's hints are NOT in the filename
        const expectedHints = FILENAME_HINTS[expectedType]
        if (!expectedHints.some(h => fname.includes(h))) {
          return {
            isValid: false,
            message: `Wrong document! This file looks like a "${DOC_TYPE_LABELS[otherType]}" but this slot expects a "${DOC_TYPE_LABELS[expectedType]}". Please upload the correct file.`,
          }
        }
      }
    }

    // For text files, also do a deep content check
    if (isText) {
      try {
        const text = await file.text()
        const content = text.toLowerCase()
        const sig = DOC_SIGNATURES[expectedType]
        if (!sig) return { isValid: true }

        const foundForbidden = sig.forbidden.find(kw => content.includes(kw))
        if (foundForbidden) {
          let detectedAs = 'a different document type'
          if (content.includes('certificate of incorporation') || content.includes('registration number')) {
            detectedAs = 'an Organisation Registration Document'
          } else if (content.includes('activity plan') || content.includes('training activities')) {
            detectedAs = 'an Activity Plan'
          } else if (content.includes('declaration') || content.includes('authorised signatory')) {
            detectedAs = 'an Authorised Signatory Declaration'
          }
          return {
            isValid: false,
            message: `Wrong document! This file appears to be ${detectedAs}. The "${DOC_TYPE_LABELS[expectedType]}" slot expects a different document.`,
          }
        }

        const hasRequired = sig.required.some(kw => content.includes(kw))
        if (!hasRequired) {
          return {
            isValid: false,
            message: `This file doesn't look like a "${DOC_TYPE_LABELS[expectedType]}". Please upload the correct document.`,
          }
        }
      } catch {
        // On read error, allow
      }
    }

    return { isValid: true }
  }

  // ── Auto-validate for Supabase columns (returns { valid, notes }) ─────────
  const autoValidateFile = async (file, docId) => {
    const isText = file.type === 'text/plain' || file.name.endsWith('.txt')
    if (!isText) {
      // PDFs/images pass automatically — caseworker reviews if needed
      return { valid: true, notes: '' }
    }
    try {
      const text = await file.text()
      const content = text.toLowerCase()
      const sig = DOC_SIGNATURES[docId]
      if (!sig) return { valid: true, notes: '' }

      const foundForbidden = sig.forbidden.find(kw => content.includes(kw))
      if (foundForbidden) {
        return { valid: false, notes: `Wrong document type detected — "${foundForbidden}" found in document` }
      }
      const hasRequired = sig.required.some(kw => content.includes(kw))
      if (!hasRequired) {
        return { valid: false, notes: 'Document content does not match expected type' }
      }
      return { valid: true, notes: '' }
    } catch {
      return { valid: true, notes: '' }
    }
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  const handleFileChange = async (docId, file) => {
    if (!file) {
      setFiles(prev => ({ ...prev, [docId]: null }))
      return
    }

    setValidating(prev => ({ ...prev, [docId]: true }))
    setError(null)
    setFileErrors(prev => ({ ...prev, [docId]: null }))

    try {
      const validation = await validateDocumentType(file, docId)
      if (!validation.isValid) {
        setFileErrors(prev => ({ ...prev, [docId]: validation.message }))
        setValidating(prev => ({ ...prev, [docId]: false }))
        return
      }
      setFileErrors(prev => ({ ...prev, [docId]: null }))
      setFiles(prev => ({ ...prev, [docId]: file }))
    } catch {
      setFileErrors(prev => ({ ...prev, [docId]: 'Error validating document. Please try again.' }))
    } finally {
      setValidating(prev => ({ ...prev, [docId]: false }))
    }
  }

  const uploadFile = async (docId, file) => {
    if (!file) return null
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}_${docId}.${ext}`
    setUploadProgress(p => ({ ...p, [docId]: 'uploading' }))
    try {
      const { error } = await supabase.storage
        .from('grant-documents')
        .upload(path, file, { upsert: true })
      if (error) throw new Error(`Upload failed for ${docId}: ${error.message}`)
      const { data: { publicUrl } } = supabase.storage
        .from('grant-documents')
        .getPublicUrl(path)
      setUploadProgress(p => ({ ...p, [docId]: 'done' }))
      return publicUrl
    } catch (err) {
      setUploadProgress(p => ({ ...p, [docId]: 'error' }))
      throw err
    }
  }

  const handleSubmit = async () => {
    if (!applicantName.trim() || !organizationName.trim() || !contactEmail.trim()) {
      setError('Please fill in all required fields')
      return
    }
    if (!contactEmail.includes('@') || !contactEmail.includes('.')) {
      setError('Please enter a valid email address')
      return
    }
    if (applicantName.trim().length < 2) {
      setError('Applicant name must be at least 2 characters')
      return
    }
    if (organizationName.trim().length < 2) {
      setError('Organisation name must be at least 2 characters')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // ── Duplicate check ──────────────────────────────────────────────────
      const { data: existing } = await supabase
        .from('grant_applications')
        .select('id, status, organization_name')
        .ilike('organization_name', organizationName.trim())
        .ilike('contact_email', contactEmail.trim())
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        setSubmitting(false)
        if (existing.status === 'approved') {
          setExistingApp(existing)
          setDuplicateApp('approved')
          return
        } else {
          setExistingApp(existing)
          setDuplicateApp('resubmit')
          return
        }
      }

      // ── Upload files & auto-validate ─────────────────────────────────────
      const urls   = {}
      const valids = {}
      const notes  = {}

      for (const doc of REQUIRED_DOCS) {
        if (files[doc.id]) {
          urls[doc.id]   = await uploadFile(doc.id, files[doc.id])
          const result   = await autoValidateFile(files[doc.id], doc.id)
          valids[doc.id] = result.valid
          notes[doc.id]  = result.notes
        } else {
          valids[doc.id] = false
          notes[doc.id]  = 'Document not provided'
        }
      }

      // ── Insert row with validation state already set ─────────────────────
      const { data, error: insertError } = await supabase
        .from('grant_applications')
        .insert({
          applicant_name:    applicantName.trim(),
          organization_name: organizationName.trim(),
          contact_email:     contactEmail.trim(),
          // URLs
          registration_url:               urls.registration               || null,
          activity_plan_url:              urls.activity_plan              || null,
          responsible_person_signoff_url: urls.responsible_person_signoff || null,
          // Validation — set immediately so status page is accurate
          registration_valid:   valids.registration,
          registration_notes:   notes.registration,
          activity_plan_valid:  valids.activity_plan,
          activity_plan_notes:  notes.activity_plan,
          signoff_valid:        valids.responsible_person_signoff,
          signoff_notes:        notes.responsible_person_signoff,
          // Status
          status: 'under_review',
        })
        .select('id')
        .single()

      if (insertError) throw new Error(insertError.message)

      const refId = data.id.slice(0, 8).toUpperCase()

      // ── Send welcome message ─────────────────────────────────────────────
      const allValid = Object.values(valids).every(v => v)
      const missingDocs = REQUIRED_DOCS.filter(d => !files[d.id])
      const invalidDocs = REQUIRED_DOCS.filter(d => files[d.id] && !valids[d.id])

      let welcomeBody = `Dear ${applicantName.trim()},\n\nThank you for submitting your grant application. We have received your application and assigned it reference number #${refId}.\n\n`

      if (allValid) {
        welcomeBody += `AppliCheck has automatically verified all your documents. Your application is ready for caseworker review.\n\n`
      } else {
        if (missingDocs.length > 0) {
          welcomeBody += `The following documents were not submitted:\n${missingDocs.map(d => `• ${d.label}`).join('\n')}\n\n`
        }
        if (invalidDocs.length > 0) {
          welcomeBody += `The following documents need attention:\n${invalidDocs.map(d => `• ${d.label}: ${notes[d.id]}`).join('\n')}\n\n`
        }
        welcomeBody += `Please use the Resubmit portal to upload the corrected documents.\n\n`
      }

      welcomeBody += `What happens next:\n• Automated document check — immediate\n• Caseworker review — within 24 hours\n• Final decision notification\n\nKind regards,\nAppliCheck`

      const { error: msgError } = await supabase.from('messages').insert({
        application_id: data.id,
        sender_type:    'foundation',
        sender_name:    'AppliCheck',
        subject:        allValid
          ? `✅ Application Received — Reference #${refId}`
          : `📋 Application Received — Action Required — Reference #${refId}`,
        body: welcomeBody,
        read: false,
      })
      if (msgError) console.error('Failed to send welcome message:', msgError)

      setSubmittedId(data.id)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const canNextStep0 = applicantName.trim() && organizationName.trim() && contactEmail.includes('@')

  // ── success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="portal-container">
        <div className="portal-success-card">
          <div className="success-anim">✓</div>
          <h2>Application Submitted!</h2>
          <p>Your grant application has been received and is now under review.</p>
          {submittedId && (
            <div className="submitted-id">
              <span>Reference ID</span>
              <strong>{submittedId.slice(0, 8).toUpperCase()}</strong>
            </div>
          )}
          <p className="success-hint">
            You will be contacted at <strong>{contactEmail}</strong> if any documents need to be updated.
          </p>
          <div className="success-actions">
            <button className="btn-primary" onClick={() => navigate(`/inbox/${submittedId}`)}>
              📧 Open My Inbox
            </button>
            <button className="btn-secondary" onClick={() => navigate(`/status/${submittedId}`)}>
              📊 View Application Status
            </button>
            <button className="btn-secondary" onClick={() => {
              setSubmitted(false); setStep(0)
              setApplicantName(''); setOrganizationName(''); setContactEmail('')
              setFiles({ registration: null, activity_plan: null, responsible_person_signoff: null })
              setUploadProgress({})
            }}>
              Submit Another Application
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Duplicate: already approved ──────────────────────────────────────────
  if (duplicateApp === 'approved') {
    return (
      <div className="portal-container">
        <div className="portal-success-card" style={{ borderTop: '5px solid #10b981' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ color: '#059669' }}>Application Already Approved</h2>
          <p>
            An application from <strong>{existingApp?.organization_name}</strong> with this email
            already exists and has been <strong>approved</strong>.
          </p>
          <p style={{ marginTop: '0.75rem', color: '#64748b', fontSize: '0.9375rem' }}>
            You cannot submit a duplicate application. If you have a question, please contact the foundation directly.
          </p>
          <div className="success-actions" style={{ marginTop: '2rem' }}>
            <button className="btn-primary" onClick={() => navigate(`/inbox/${existingApp.id}`)}>
              📧 Open My Inbox
            </button>
            <button className="btn-secondary" onClick={() => navigate(`/status/${existingApp.id}`)}>
              📊 View Application Status
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Duplicate: not yet accepted — treat as resubmission ──────────────────
  if (duplicateApp === 'resubmit') {
    return (
      <div className="portal-container">
        <div className="portal-success-card" style={{ borderTop: '5px solid #f59e0b' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📋</div>
          <h2 style={{ color: '#b45309' }}>Application Already Exists</h2>
          <p>
            We found an existing application from <strong>{existingApp?.organization_name}</strong> with this email.
          </p>
          <p style={{ marginTop: '0.75rem', color: '#64748b', fontSize: '0.9375rem' }}>
            If you want to update or correct your documents, please use the resubmission portal instead.
          </p>
          <div className="submitted-id" style={{ margin: '1.5rem 0' }}>
            <span>Your Reference ID</span>
            <strong>{existingApp?.id?.slice(0, 8).toUpperCase()}</strong>
          </div>
          <div className="success-actions">
            <button className="btn-primary" onClick={() => navigate('/resubmit')}>
              📤 Resubmit Documents
            </button>
            <button className="btn-secondary" onClick={() => navigate(`/inbox/${existingApp.id}`)}>
              📧 Open My Inbox
            </button>
            <button className="btn-secondary" onClick={() => { setDuplicateApp(null); setExistingApp(null) }}>
              Submit as New Application Anyway
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── main form ─────────────────────────────────────────────────────────────
  return (
    <div className="portal-container">
      {/* Header */}
      <div className="portal-header">
        <div className="portal-header-left">
          <h1>Grant Application Portal</h1>
          <p>Submit your organisation's grant application</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="stepper">
        {STEPS.map((s, i) => (
          <div key={s} className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <div className="step-circle">
              {i < step ? '✓' : i + 1}
            </div>
            <span className="step-label">{s}</span>
            {i < STEPS.length - 1 && <div className={`step-line ${i < step ? 'done' : ''}`} />}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="portal-card">

        {/* ── STEP 0: Organisation Info ── */}
        {step === 0 && (
          <div className="portal-step">
            <h2>Organisation Information</h2>
            <p className="step-desc">Tell us about your organisation and primary contact.</p>

            <div className="form-grid">
              <div className="form-group">
                <label>Your Name <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Alice Martin"
                  value={applicantName}
                  onChange={e => setApplicantName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Organisation Name <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Community Workshop B"
                  value={organizationName}
                  onChange={e => setOrganizationName(e.target.value)}
                />
                <span className="form-hint">This must match your registration document exactly</span>
              </div>
              <div className="form-group full">
                <label>Contact Email <span className="required">*</span></label>
                <input
                  type="email"
                  placeholder="contact@yourorganisation.org"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                />
                <span className="form-hint">We will contact you here if documents need updating</span>
              </div>
            </div>

            <div className="step-actions">
              <div />
              <button
                className="btn-primary"
                disabled={!canNextStep0}
                onClick={() => setStep(1)}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 1: Documents ── */}
        {step === 1 && (
          <div className="portal-step">
            <h2>Upload Required Documents</h2>
            <p className="step-desc">
              All three documents are required for your application to reach review-ready status.
              Missing documents will be flagged automatically.
            </p>

            <div className="doc-upload-list">
              {REQUIRED_DOCS.map(doc => {
                const file = files[doc.id]
                return (
                  <div key={doc.id} className={`doc-upload-item ${file ? 'has-file' : ''}`}>
                    <div className="doc-upload-icon">{doc.icon}</div>
                    <div className="doc-upload-info">
                      <h4>{doc.label}</h4>
                      <p>{doc.description}</p>
                      {fileErrors[doc.id] && (
                        <div className="resubmit-file-error">❌ {fileErrors[doc.id]}</div>
                      )}
                      {file && (
                        <div className="file-chip">
                          <span>📄 {file.name}</span>
                          <button className="remove-file" onClick={() => handleFileChange(doc.id, null)}>✕</button>
                        </div>
                      )}
                    </div>
                    <div className="doc-upload-action">
                      {validating[doc.id] ? (
                        <div className="validating-state">
                          <div className="validation-spinner" />
                          <span>Checking…</span>
                        </div>
                      ) : !file ? (
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
                        <div className="upload-success">
                          <span className="validation-check">✓</span>
                          <span>Ready</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {REQUIRED_DOCS.filter(d => !files[d.id]).length > 0 && (
              <div className="missing-warning">
                <p>
                  ⚠️ {REQUIRED_DOCS.filter(d => !files[d.id]).length} document(s) not yet uploaded.
                  You can still submit — missing items will be flagged for follow-up.
                </p>
              </div>
            )}

            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep(0)}>← Back</button>
              <button className="btn-primary" onClick={() => setStep(2)}>
                Review Application →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Review ── */}
        {step === 2 && (
          <div className="portal-step">
            <h2>Review & Submit</h2>
            <p className="step-desc">Please confirm your details before submitting.</p>

            <div className="review-section">
              <h3>Organisation Details</h3>
              <div className="review-grid">
                <div className="review-row">
                  <span className="review-label">Applicant Name</span>
                  <span className="review-value">{applicantName}</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Organisation Name</span>
                  <span className="review-value">{organizationName}</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Contact Email</span>
                  <span className="review-value">{contactEmail}</span>
                </div>
              </div>
            </div>

            <div className="review-section">
              <h3>Document Checklist</h3>
              {REQUIRED_DOCS.map(doc => {
                const file = files[doc.id]
                return (
                  <div key={doc.id} className={`review-doc-row ${file ? 'present' : 'missing'}`}>
                    <span className="review-doc-icon">{file ? '✓' : '✗'}</span>
                    <div className="review-doc-info">
                      <strong>{doc.label}</strong>
                      {file
                        ? <span className="review-filename">{file.name}</span>
                        : <span className="review-missing">Not provided — will be flagged</span>
                      }
                    </div>
                  </div>
                )
              })}
            </div>

            {error && (
              <div className="submit-error">
                <strong>Submission failed:</strong> {error}
              </div>
            )}

            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button
                className="btn-submit"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? '⏳ Uploading & Submitting…' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
