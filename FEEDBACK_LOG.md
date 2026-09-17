# Feedback & Iteration Log
## C07: Documentation Feedback Dashboard

---

## The Pain (From Client Interview)

> "An application looks promising, but we keep exchanging emails about missing or mismatched evidence. The applicant thinks we are rejecting the idea. We need a precise next step without pretending we have already made the funding decision."

### Root Problems Identified

1. **Vague communication:** "Your application is incomplete" tells applicant nothing
2. **Mixed signals:** Applicant can't distinguish documentation issues from idea rejection
3. **Inefficient loops:** Multiple email rounds to clarify what's missing
4. **Manual effort:** Caseworker writes custom emails each time

---

## Initial Hypothesis

**If** we show caseworkers exactly what's missing/wrong  
**And** generate specific email feedback  
**Then** applicants will know exactly what to fix  
**And** reach review-ready state faster

---

## Client Feedback Round 1 (Hypothetical)

### Feedback: "How do I know it's really a mismatch?"

**Client concern:** "The dashboard says registration name is mismatched, but what if it's a legal name vs trade name situation?"

**Our response:**
- Added detail field showing BOTH names
- Email now says: "Document says X but should be Y"
- Caseworker can see the specific discrepancy before sending

**Change made:** Enhanced document notes to show actual vs expected values

---

### Feedback: "What if they fix only 1 of 3 issues?"

**Client concern:** "If they resubmit with only the activity plan, do I see that in the dashboard?"

**Our response:**
- Current prototype: Would need page refresh
- Real system: Would show updated status automatically
- Documented in limitations section

**Change made:** Added to "Next Integration" - need webhook for resubmission events

---

### Feedback: "Some grants have different requirements"

**Client concern:** "Youth training programs need safeguarding checks, but adult training doesn't"

**Our response:**
- Current prototype: Fixed 3-document requirement
- Design supports configurable document lists (see `requiredDocuments` in JSON)
- Future: Grant type selection changes required docs

**Change made:** Noted in WOLF handoff as "HIGH RISK - Grant Type Variability"

---

## Client Feedback Round 2 (Hypothetical)

### Feedback: "The email is too formal"

**Client concern:** "We usually have a friendlier tone with applicants"

**Our response:**
- Email template is customizable (see `generateEmail()` function)
- Product owner can define tone and structure
- Demo uses formal tone as neutral starting point

**Change made:** Added note in email: "This is NOT a rejection of your proposal"

---

### Feedback: "What about document types I haven't thought of?"

**Client concern:** "Next month we might need tax clearance certificates too"

**Our response:**
- System is designed for extensibility
- Add new document type to `requiredDocuments` array
- No code changes needed, just data configuration

**Change made:** Documented in README under "If We Had More Time"

---

## What We Changed After Feedback

### Design Changes

| Original | After Feedback | Why |
|----------|----------------|-----|
| Just show ✓/✗ | Show ✓/✗/⚠️ | Distinguish missing vs mismatch |
| Generic "incomplete" badge | "3 issues" badge | Show severity/count |
| Hidden detail | Visible detail in checklist | Transparency for caseworker |
| "Send email" button | "Send email (Simulated)" | Honest about prototype limits |

### Content Changes

1. **Email explicitly states:** "This is NOT a rejection" → prevents confusion
2. **Issues are numbered:** Makes it easy for applicant to address systematically
3. **Each issue has context:** Not just "missing" but what document and why it matters

### Technical Changes

1. **Separated data from logic:** `initial.json` can be swapped without code changes
2. **Simulation controls:** "Reset Demo" and "Simulate Update" for presentations
3. **Clear labels:** Everything simulated is marked as such

---

## Evidence That It Works

### Before (Current State)

**Caseworker writes:**
> "Dear Applicant, Your application is incomplete. Please provide all required documents. Regards, Foundation"

**Result:** 
- Applicant confused which documents
- Replies asking for clarification
- 2-3 email rounds
- 5-7 days to resolution

### After (With Dashboard)

**Dashboard shows:**
- ⚠️ Registration name mismatch with specific details
- ✗ Activity plan missing
- ✗ Responsible person signoff missing

**Generated email includes:**
> "1. Registration name mismatch: Document says 'Community Workshop C' but should be 'Community Workshop B'
> 2. Activity plan document is missing
> 3. Responsible person signoff is missing"

**Result:**
- Applicant knows exactly what to fix
- 1 email round
- Expected: 2-3 days to resolution

---

## Validation Evidence

### Test Case: APP-002 (Worst Case)

**Starting state:** 3 issues (1 mismatch + 2 missing)

**Test steps:**
1. Select APP-002
2. Review checklist → all 3 issues visible
3. Click "Notify Applicant"
4. Email lists all 3 specific issues
5. Simulate applicant fixing all issues
6. Dashboard updates to "Review Ready" ✓

**Result:** Complete workflow demonstrated

---

## What Remains Hypothetical

### Hypothesis 1: Time Savings
**Claim:** Reduces resolution time from 5-7 days to 2-3 days  
**Status:** UNTESTED - needs pilot with real caseworkers + applicants

### Hypothesis 2: Clarity Improvement
**Claim:** Applicants understand what to fix without follow-up questions  
**Status:** UNTESTED - needs user testing with real grant applicants

### Hypothesis 3: Caseworker Adoption
**Claim:** Faster than writing manual emails  
**Status:** UNTESTED - needs time study comparing manual vs dashboard

---

## Next Validation Steps

1. **Week 1:** Observational study with 3 caseworkers using current manual process
2. **Week 2:** Same caseworkers use prototype with 5 real applications
3. **Week 3:** Survey applicants who received generated emails
4. **Week 4:** Measure time-to-resubmission for both groups

**Success criteria:**
- ✅ Caseworkers prefer dashboard over manual
- ✅ Applicants report better clarity
- ✅ Measurable reduction in email count
- ✅ Faster time to review-ready state

---

## Lessons Learned

### What Worked Well
1. Starting with real client pain point (vague emails)
2. Building with actual data structure (initial.json)
3. Showing complete workflow (incomplete → fixed)
4. Being honest about simulations

### What We'd Do Differently
1. Start with more grant types to test configurability
2. Build applicant-facing view earlier
3. Include timestamp/history tracking
4. Add more validation rule examples

### Biggest Assumption to Test
**"Applicants will understand email feedback without human explanation"**

This is critical - if generated emails still cause confusion, the whole solution fails.

**Test:** Send generated email to 5 applicants, ask them to explain what they need to do.

---

**Last Updated:** 2026-09-17  
**Status:** Prototype complete, awaiting validation testing
