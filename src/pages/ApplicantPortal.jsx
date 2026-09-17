import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../styles/portal.css'

const REQUIRED_DOCS = [
  {
    id: 'registration',
    label: 'Organization Registration Document',
    description: 'Official document proving your legal registration status',
    accept: '.pdf,.doc,.docx,.jpg,.png',
    icon: '🏛️',
  },
  {
    id: 'activity_plan',
    label: 'Activity Plan',
    description: 'Detailed plan of your training activities and expected outcomes',
    accept: '.pdf,.doc,.docx',
    icon: '📋',
  },
  {
    id: 'responsible_person_signoff',
    label: 'Responsible Person Signoff',
    description: 'Signed declaration from an authorized representative',
    accept: '.pdf,.doc,.docx,.jpg,.png',
    icon: '✍️',
  },
]

const STEPS = ['Organisation', 'Documents', 'Review & Submit']

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
  const [duplicateApp, setDuplicateApp] = useState(null) // 'approved' | 'resubmit'
  const [existingApp, setExistingApp]   = useState(null)
  const [uploadProgress, setUploadProgress] = useState({})
  const [files, setFiles] = useState({ registration: null, activity_plan: null, responsible_person_signoff: null })
  const [validating, setValidating] = useState({})
  const [fileErrors, setFileErrors] = useState({})

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
      // Smart document validation - detect if wrong file type uploaded
      const validation = await validateDocumentType(file, docId)
      if (!validation.isValid) {
        setFileErrors(prev => ({ ...prev, [docId]: validation.message }))
        setValidating(prev => ({ ...prev, [docId]: false }))
        return
      }

      setFileErrors(prev => ({ ...prev, [docId]: null }))
      setFiles(prev => ({ ...prev, [docId]: file }))
    } catch (err) {
      setFileErrors(prev => ({ ...prev, [docId]: 'Error validating document. Please try again.' }))
    } finally {
      setValidating(prev => ({ ...prev, [docId]: false }))
    }
  }

  // AI-powered document type detection using OCR/text analysis
  const validateDocumentType = async (file, expectedType) => {
    // Simulate OCR processing delay
    await new Promise(resolve => setTimeout(resolve, 800))

    try {
      // In production: Use OCR API (Tesseract.js, Google Vision API, etc.)
      // For demo: Simulate reading document headers and company data
      const documentText = await simulateOCR(file)
      
      // Define document type signatures based on headers/content
      const documentTypes = {
        registration: {
          headers: ['CERTIFICATE OF INCORPORATION', 'COMPANY REGISTRATION', 'ORGANIZATION REGISTRATION', 'LEGAL REGISTRATION', 'BUSINESS REGISTRATION'],
          requiredFields: ['company name', 'registration number', 'incorporation date', 'registered office']
        },
        activity_plan: {
          headers: ['ACTIVITY PLAN', 'TRAINING PLAN', 'PROJECT PLAN', 'PROGRAM ACTIVITIES', 'CURRICULUM PLAN'],
          requiredFields: ['activities', 'timeline', 'objectives', 'expected outcomes', 'training schedule']
        },
        responsible_person_signoff: {
          headers: ['DECLARATION', 'AUTHORIZATION LETTER', 'SIGNATORY DECLARATION', 'RESPONSIBLE PERSON', 'AUTHORIZED REPRESENTATIVE'],
          requiredFields: ['signature', 'signatory name', 'title', 'date signed', 'authorization']
        }
      }

      // Check if document matches expected type
      const expectedDoc = documentTypes[expectedType]
      const hasCorrectHeader = expectedDoc.headers.some(header => 
        documentText.toUpperCase().includes(header)
      )
      
      if (!hasCorrectHeader) {
        // Check if it matches a different document type
        for (const [docType, docSpec] of Object.entries(documentTypes)) {
          if (docType !== expectedType) {
            const matchesOtherType = docSpec.headers.some(header => 
              documentText.toUpperCase().includes(header)
            )
            if (matchesOtherType) {
              const docTypeLabels = {
                registration: 'Organization Registration Document',
                activity_plan: 'Activity Plan',
                responsible_person_signoff: 'Responsible Person Signoff'
              }
              
              return {
                isValid: false,
                message: `Document mismatch detected. This appears to be a "${docTypeLabels[docType]}" but you're uploading it as "${docTypeLabels[expectedType]}". Please upload the correct document type.`
              }
            }
          }
        }
        
        // If no clear type detected, show generic error
        const docTypeLabels = {
          registration: 'Organization Registration Document',
          activity_plan: 'Activity Plan', 
          responsible_person_signoff: 'Responsible Person Signoff'
        }
        
        return {
          isValid: false,
          message: `Document type unclear. Expected "${docTypeLabels[expectedType]}" with header containing one of: ${expectedDoc.headers.slice(0,2).join(' or ')}. Please check your document.`
        }
      }

      // Validate company name consistency (if organization name is filled)
      if (organizationName.trim() && !documentText.toUpperCase().includes(organizationName.trim().toUpperCase())) {
        return {
          isValid: false,
          message: `Company name mismatch. Document should contain "${organizationName}" but we found different company information. Please ensure the document belongs to your organization.`
        }
      }

      return { isValid: true }
      
    } catch (error) {
      return {
        isValid: false,
        message: 'Could not read document. Please ensure it\'s a clear, text-readable PDF or image file.'
      }
    }
  }

  // Simulate OCR text extraction (in production: use real OCR API)
  const simulateOCR = async (file) => {
    // For demo: Read file content if it's a text file, otherwise mock based on filename
    try {
      if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
        // Read actual file content for text files
        const text = await file.text()
        return text
      } else {
        // For PDF/images, mock OCR based on filename patterns
        const filename = file.name.toLowerCase()
        
        if (filename.includes('registration') || filename.includes('certificate')) {
          return `CERTIFICATE OF INCORPORATION
          
Company Name: ${organizationName || 'Example Corp Ltd'}
Registration Number: RC123456
Incorporation Date: January 15, 2020
Registered Office: 123 Business Street, Casablanca
Legal Status: Private Limited Company`
        }
        
        if (filename.includes('activity') || filename.includes('plan')) {
          return `TRAINING ACTIVITY PLAN
          
Organization: ${organizationName || 'Example Corp Ltd'}
Project Title: Digital Skills Training Program
Duration: 6 months
Activities:
- Web development training
- Digital marketing workshops
- Certification programs
Expected Outcomes: 50 trained participants`
        }
        
        if (filename.includes('signoff') || filename.includes('declaration')) {
          return `DECLARATION OF AUTHORIZED REPRESENTATIVE
          
Organization: ${organizationName || 'Example Corp Ltd'}
I, John Smith, as Director of ${organizationName || 'Example Corp Ltd'}, 
hereby declare and authorize this application.
Signature: [Signed]
Date: ${new Date().toLocaleDateString()}
Title: Managing Director`
        }
        
        // Default mock for unclear files
        return `SAMPLE DOCUMENT
Generic content without clear document type indicators.
Organization mentioned: ${organizationName || 'Unknown Company'}
This document format is unclear.`
      }
    } catch (error) {
      throw new Error('Could not read document content')
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
    } catch (error) {
      setUploadProgress(p => ({ ...p, [docId]: 'error' }))
      throw error
    }
  }

  const handleSubmit = async () => {
    // Validation
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
      setError('Organization name must be at least 2 characters')
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
          // Block — already approved
          setExistingApp(existing)
          setDuplicateApp('approved')
          return
        } else {
          // under_review or rejected — treat as resubmission
          setExistingApp(existing)
          setDuplicateApp('resubmit')
          return
        }
      }
      // ── End duplicate check ───────────────────────────────────────────────

      // Upload files that were provided
      const urls = {}
      for (const doc of REQUIRED_DOCS) {
        if (files[doc.id]) {
          urls[doc.id] = await uploadFile(doc.id, files[doc.id])
        }
      }

      // Insert row into Supabase
      const { data, error: insertError } = await supabase
        .from('grant_applications')
        .insert({
          applicant_name: applicantName.trim(),
          organization_name: organizationName.trim(),
          contact_email: contactEmail.trim(),
          registration_url: urls.registration || null,
          activity_plan_url: urls.activity_plan || null,
          responsible_person_signoff_url: urls.responsible_person_signoff || null,
          status: 'under_review',
        })
        .select('id')
        .single()

      if (insertError) throw new Error(insertError.message)
      
      // Generate reference ID for the welcome message
      const refId = data.id.slice(0, 8).toUpperCase()
      
      // Send automatic welcome message
      const welcomeMessage = {
        application_id: data.id,
        sender_type: 'foundation',
        sender_name: 'Schmitz-Stiftungen',
        subject: `Application Received - Reference #${refId}`,
        body: `Dear ${applicantName.trim()},

Thank you for submitting your grant application. We have received your application and assigned it reference number #${refId}.

AppliCheck has automatically scanned your documents. If anything is missing or needs correction, you will receive a precise request here in your inbox — usually within minutes.

What happens next:
• Automated document check — immediate
• Caseworker review — within 24 hours
• Final decision notification

You can track your application status and receive updates through your inbox.

If you have any questions, feel free to send us a message through the inbox.

Best regards,
The Foundation Team`,
        read: false
      }
      
      const { error: msgError } = await supabase.from('messages').insert(welcomeMessage)
      if (msgError) {
        console.error('Failed to send welcome message:', msgError)
        // Don't fail the whole submission if message fails
      }
      
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
            <button
              className="btn-primary"
              onClick={() => navigate(`/inbox/${existingApp.id}`)}
            >
              📧 Open My Inbox
            </button>
            <button
              className="btn-secondary"
              onClick={() => navigate(`/status/${existingApp.id}`)}
            >
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
            <button
              className="btn-primary"
              onClick={() => navigate('/resubmit')}
            >
              📤 Resubmit Documents
            </button>
            <button
              className="btn-secondary"
              onClick={() => navigate(`/inbox/${existingApp.id}`)}
            >
              📧 Open My Inbox
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setDuplicateApp(null)
                setExistingApp(null)
              }}
            >
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
              Missing documents will be flagged by the caseworker.
            </p>

            <div className="doc-upload-list">
              {REQUIRED_DOCS.map(doc => {
                const file = files[doc.id]
                const progress = uploadProgress[doc.id]
                return (
                  <div key={doc.id} className={`doc-upload-item ${file ? 'has-file' : ''}`}>
                    <div className="doc-upload-icon">{doc.icon}</div>
                    <div className="doc-upload-info">
                      <h4>{doc.label}</h4>
                      <p>{doc.description}</p>
                      {file && (
                        <div className="file-chip">
                          <span>📄 {file.name}</span>
                          <button
                            className="remove-file"
                            onClick={() => handleFileChange(doc.id, null)}
                          >✕</button>
                        </div>
                      )}
                    </div>
                    <div className="doc-upload-action">
                      {validating[doc.id] ? (
                        <div className="validating-state">
                          <div className="validation-spinner"></div>
                          <span>Validating...</span>
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
                          <span>Validated</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="missing-warning">
              {REQUIRED_DOCS.filter(d => !files[d.id]).length > 0 && (
                <p>
                  ⚠️ {REQUIRED_DOCS.filter(d => !files[d.id]).length} document(s) missing.
                  Your application can still be submitted, but will be flagged as incomplete.
                </p>
              )}
            </div>

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
                {submitting ? (
                  <span className="spinner-text">⏳ Uploading & Submitting…</span>
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
