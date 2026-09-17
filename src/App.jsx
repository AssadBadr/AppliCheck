import { useState } from 'react'
import './App.css'
import initialData from './data/initial.json'

function App() {
  const [applications, setApplications] = useState(initialData.applications)
  const [selectedApp, setSelectedApp] = useState(null)
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Check if application is review-ready
  const isReviewReady = (app) => {
    return Object.values(app.documents).every(doc => doc.submitted && doc.valid)
  }

  // Get list of issues for an application
  const getIssues = (app) => {
    const issues = []
    
    initialData.requiredDocuments.forEach(reqDoc => {
      const doc = app.documents[reqDoc.id]
      
      if (!doc.submitted) {
        issues.push({
          type: 'missing',
          document: reqDoc.name,
          message: `${reqDoc.name} is missing`,
          detail: doc.notes
        })
      } else if (!doc.valid) {
        issues.push({
          type: 'mismatch',
          document: reqDoc.name,
          message: `${reqDoc.name} has validation issues`,
          detail: doc.notes
        })
      }
    })
    
    return issues
  }

  // Generate email content
  const generateEmail = (app) => {
    const issues = getIssues(app)
    
    return {
      to: app.contactEmail,
      subject: `Grant Application ${app.id} - Additional Documentation Required`,
      body: `Dear ${app.organizationName} team,

Thank you for submitting your grant application (${app.id}) on ${new Date(app.submittedDate).toLocaleDateString()}.

We are reviewing your application and need additional documentation before we can proceed to the evaluation stage. This is NOT a rejection of your proposal - we simply need a complete file to continue the review process.

Please address the following items:

${issues.map((issue, i) => `${i + 1}. ${issue.message}${issue.detail ? '\n   → ' + issue.detail : ''}`).join('\n\n')}

Once you have prepared these documents, please resubmit through the application portal.

If you have questions about any of these requirements, please reply to this email.

Best regards,
Foundation Programme Review Team

---
This is a simulated email for demonstration purposes.
Application ID: ${app.id}
Generated: ${new Date().toLocaleString()}`
    }
  }

  // Simulate email sending
  const handleSendEmail = () => {
    setEmailSent(true)
    setTimeout(() => {
      setEmailSent(false)
      setShowEmailPreview(false)
    }, 3000)
  }

  // Simulate incoming updated application
  const handleSimulateUpdate = (appId) => {
    const updatedApps = applications.map(app => {
      if (app.id === appId && appId === 'APP-002') {
        // Simulate APP-002 fixing issues
        return {
          ...app,
          documents: {
            registration: {
              submitted: true,
              valid: true,
              submittedName: "Community Workshop B",
              notes: ""
            },
            activityPlan: {
              submitted: true,
              valid: true,
              notes: ""
            },
            responsiblePersonSignoff: {
              submitted: true,
              valid: true,
              notes: ""
            }
          }
        }
      }
      return app
    })
    
    setApplications(updatedApps)
    setSelectedApp(updatedApps.find(a => a.id === appId))
  }

  const resetData = () => {
    setApplications(initialData.applications)
    setSelectedApp(null)
    setShowEmailPreview(false)
  }

  return (
    <div className="app-container">
      <header>
        <div>
          <h1>Grant Application Review Dashboard</h1>
          <p className="subtitle">C07: Clear documentation feedback for applicants</p>
        </div>
        <button className="reset-btn" onClick={resetData}>Reset Demo</button>
      </header>

      <div className="main-content">
        {/* Applications List */}
        <aside className="applications-list">
          <h2>Applications Under Review</h2>
          {applications.map(app => {
            const ready = isReviewReady(app)
            const issueCount = getIssues(app).length
            
            return (
              <div
                key={app.id}
                className={`app-card ${selectedApp?.id === app.id ? 'selected' : ''} ${ready ? 'ready' : 'incomplete'}`}
                onClick={() => {
                  setSelectedApp(app)
                  setShowEmailPreview(false)
                }}
              >
                <div className="app-header">
                  <h3>{app.organizationName}</h3>
                  <span className={`status-badge ${ready ? 'ready' : 'incomplete'}`}>
                    {ready ? '✓ Ready' : `${issueCount} issue${issueCount > 1 ? 's' : ''}`}
                  </span>
                </div>
                <div className="app-meta">
                  <span className="app-id">{app.id}</span>
                  <span>Submitted {new Date(app.submittedDate).toLocaleDateString()}</span>
                </div>
              </div>
            )
          })}
        </aside>

        {/* Application Details */}
        <main className="application-details">
          {!selectedApp ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>Select an application to review documentation status</p>
            </div>
          ) : (
            <>
              <div className="details-header">
                <div>
                  <h2>{selectedApp.organizationName}</h2>
                  <p className="app-id-display">Application ID: {selectedApp.id}</p>
                </div>
                {isReviewReady(selectedApp) && (
                  <div className="ready-badge">
                    <span className="ready-icon">✓</span>
                    Review Ready
                  </div>
                )}
              </div>

              {/* Document Checklist */}
              <section className="document-checklist">
                <div className="checklist-header-section">
                  <h3>Required Documentation</h3>
                  <div className="completion-summary">
                    {(() => {
                      const total = initialData.requiredDocuments.length
                      const completed = initialData.requiredDocuments.filter(reqDoc => {
                        const doc = selectedApp.documents[reqDoc.id]
                        return doc.submitted && doc.valid
                      }).length
                      const percentage = Math.round((completed / total) * 100)
                      
                      return (
                        <>
                          <div className="completion-bar">
                            <div className="completion-fill" style={{width: `${percentage}%`}}></div>
                          </div>
                          <div className="completion-text">
                            <span className="completion-count">{completed} of {total} complete</span>
                            <span className="completion-percent">{percentage}%</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
                
                {initialData.requiredDocuments.map(reqDoc => {
                  const doc = selectedApp.documents[reqDoc.id]
                  let status = 'missing'
                  if (doc.submitted && doc.valid) status = 'present'
                  else if (doc.submitted && !doc.valid) status = 'mismatch'
                  
                  return (
                    <div key={reqDoc.id} className={`doc-item status-${status}`}>
                      <div className="doc-status">
                        {status === 'present' && <span className="icon">✓</span>}
                        {status === 'mismatch' && <span className="icon">⚠</span>}
                        {status === 'missing' && <span className="icon">✗</span>}
                      </div>
                      <div className="doc-info">
                        <h4>{reqDoc.name}</h4>
                        <p className="doc-description">{reqDoc.description}</p>
                        {doc.notes && (
                          <p className="doc-notes">{doc.notes}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </section>

              {/* Actions */}
              {!isReviewReady(selectedApp) && (
                <section className="actions">
                  <button 
                    className="btn-primary"
                    onClick={() => setShowEmailPreview(!showEmailPreview)}
                  >
                    {showEmailPreview ? 'Hide Email' : 'Notify Applicant'}
                  </button>

                  {showEmailPreview && (
                    <div className="email-preview">
                      <div className="email-header">
                        <h4>📧 Notification Preview</h4>
                      </div>
                      
                      {(() => {
                        const email = generateEmail(selectedApp)
                        return (
                          <>
                            <div className="email-field">
                              <strong>To:</strong> {email.to}
                            </div>
                            <div className="email-field">
                              <strong>Subject:</strong> {email.subject}
                            </div>
                            <div className="email-body">
                              <pre>{email.body}</pre>
                            </div>
                            
                            {!emailSent ? (
                              <button className="btn-send" onClick={handleSendEmail}>
                                Send Notification
                              </button>
                            ) : (
                              <div className="email-sent">
                                ✓ Email sent (simulation)
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  )}

                  {/* Simulate applicant response */}
                  {selectedApp.id === 'APP-002' && (
                    <div className="simulation-box">
                      <h4>🔄 Simulate Applicant Response</h4>
                      <p>Test the workflow: simulate this applicant fixing all issues and resubmitting.</p>
                      <button 
                        className="btn-secondary"
                        onClick={() => handleSimulateUpdate(selectedApp.id)}
                      >
                        Simulate Updated Submission
                      </button>
                    </div>
                  )}
                </section>
              )}

              {isReviewReady(selectedApp) && (
                <section className="success-state">
                  <div className="success-icon">✓</div>
                  <h3>Documentation Complete</h3>
                  <p>All required documents are present and validated. This application is ready for evaluation.</p>
                  <p className="next-step">Next step: Forward to evaluation committee</p>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
