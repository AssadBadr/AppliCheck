import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import CaseworkerDashboard from './pages/CaseworkerDashboard'
import ApplicantPortal from './pages/ApplicantPortal'
import ApplicantStatus from './pages/ApplicantStatus'
import ApplicantInbox from './pages/ApplicantInbox'
import FoundationInbox from './pages/FoundationInbox'
import ResubmitPortal from './pages/ResubmitPortal'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"                element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"       element={<CaseworkerDashboard />} />
        <Route path="/apply"           element={<ApplicantPortal />} />
        <Route path="/status/:id"      element={<ApplicantStatus />} />
        <Route path="/inbox/:id"       element={<ApplicantInbox />} />
        <Route path="/foundation-inbox" element={<FoundationInbox />} />
        <Route path="/resubmit"         element={<ResubmitPortal />} />
        {/* catch-all */}
        <Route path="*"                element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
