# C07: Clear Documentation Feedback Dashboard

**DaiL Casablanca AI Lab — Octopus Day Hackathon**  
**Challenge:** The application is incomplete, but the applicant does not know why

## Problem Statement

Foundation caseworkers receive grant applications from training organizations. When documentation is incomplete or mismatched, current email responses are vague ("your application is incomplete"), causing:

- **Applicants** think their idea is being rejected
- **Caseworkers** waste time in multi-week email loops
- **Ambiguity** prevents reaching a review-ready state

**Key insight:** Incomplete documentation ≠ rejection. We need precise feedback to separate file completeness from funding decisions.

---

## Solution

A caseworker dashboard that:

1. **Shows clear documentation status** with visual indicators (✓ ✗ ⚠)
2. **Lists specific issues** for each application
3. **Generates precise email notifications** stating exactly what needs fixing
4. **Demonstrates workflow completion** from incomplete → corrected → review-ready

---

## Run Instructions

### Prerequisites
- Node.js 18+ and npm installed
- Modern web browser

### Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173/
```

The dashboard will load with two sample applications demonstrating different states.

---

## Real vs Simulated Components

### ✅ Real (Functional)
- Document checklist validation logic
- Email generation with specific issue lists
- Application status calculation (review-ready vs incomplete)
- UI interactions (select application, preview email)
- State management (React useState)

### 🎭 Simulated (Labeled)
- **Email sending** - Button says "Send Email (Simulated)" 
  - Real system would integrate with email service
  - Shows preview only, no actual SMTP
  
- **Applicant resubmission** - "Simulate Updated Submission" button
  - Real system would receive new documents via portal
  - Demo shows state transition manually
  
- **Document validation** - Uses hard-coded initial.json
  - Real system would integrate with document storage
  - Would validate uploaded PDFs, check signatures, etc.

All simulated components are clearly labeled in the UI.

---

## Evidence View & Failure Cases

### Starting State

**APP-001: Learning Workshop A** (1 issue)
- ✓ Registration present
- ✓ Activity plan present
- ✗ Responsible person signoff **MISSING**

**APP-002: Community Workshop B** (3 issues - failure case)
- ⚠ Registration name mismatch: says "Community Workshop C"
- ✗ Activity plan **MISSING**
- ✗ Responsible person signoff **MISSING**

### Demonstrated Workflow

1. Select APP-002 (worst case)
2. Click "Notify Applicant"
3. Email preview shows **exactly 3 specific issues**
4. Click "Simulate Updated Submission"
5. Application state changes to review-ready ✓
6. Dashboard shows success state

### What This Proves

Before: "Your application is incomplete" → applicant confused
After: "Registration name mismatch: Document says 'Community Workshop C' but should be 'Community Workshop B'" → applicant knows exactly what to fix

---

## Limitations & Assumptions

### Current Limitations

1. **No authentication** - No user login or role management
2. **No persistence** - Data resets on page reload (use "Reset Demo" button)
3. **No real document viewing** - Doesn't open/preview actual PDFs
4. **No automatic notifications** - Email sending is manual + simulated
5. **Simple validation rules** - Real system would have complex document requirements
6. **No audit trail** - Doesn't log who reviewed what when

### Assumptions Made

1. Three document types are sufficient for demo
2. "Review-ready" = all docs present + valid
3. Email is the notification channel (could be portal notification)
4. Caseworker manually reviews before notifying (no auto-send)
5. Name mismatch is detectable programmatically

---

## Next Validation Test

**Recommended next step:** Contextual interview with real caseworker

**Test scenario:**
1. Show dashboard with 2 real redacted applications from their backlog
2. Ask: "Would this email save you time compared to what you write today?"
3. Ask: "What issues does this miss that you currently check for?"
4. Observe: Do they understand the interface without explanation?

**Success criteria:**
- Caseworker can generate actionable feedback in <2 minutes
- Applicant receiving the email knows exactly what to fix
- No need to explain what "review-ready" means

**Key questions to validate:**
- Are these the right document types?
- What validation rules are missing?
- Should "mismatch" have severity levels?
- How do they currently track resubmissions?

---

## Technical Stack

- **Framework:** React 19 + Vite 8
- **Styling:** Custom CSS (no framework)
- **State:** React useState (no external state management)
- **Data:** Static JSON (src/data/initial.json)

**Why this stack:**
- Fast prototyping (< 1 day build time)
- No backend required for demo
- Easy to modify based on feedback
- Clear separation of data/logic/UI

---

## File Structure

```
src/
├── App.jsx              # Main dashboard component
├── App.css              # All styles
├── data/
│   └── initial.json     # Sample applications + document definitions
└── main.jsx             # React entry point
```

---

## Pain → Feedback → Changes Log

### Initial Pain (from brief)
"An application looks promising, but we keep exchanging emails about missing or mismatched evidence. The applicant thinks we are rejecting the idea."

### Client Feedback (hypothetical - to be tested)
Potential concerns to address:
1. "What if document types vary by grant type?"
2. "How do I know when they've resubmitted?"
3. "Can I customize the email template?"

### Changes Made
- Added clear status badges (Ready / X issues)
- Separated documentation issues from funding decisions
- Email explicitly states "NOT a rejection"
- Demonstrated full workflow from incomplete → fixed
- Added simulation controls for demo purposes

### If We Had More Time
- Multiple grant types with different requirements
- Email template editor
- Notification when applicant resubmits
- Document preview pane
- History of previous submissions
