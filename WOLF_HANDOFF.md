# Wolf Handoff Document
## C07: Documentation Feedback Dashboard

**Date:** 2026-09-17  
**Event:** DaiL Casablanca AI Lab — Octopus Day  
**Team:** [Your Team Name]

---

## What We Built

A caseworker dashboard that shows documentation status for grant applications and generates precise email feedback listing specific missing/mismatched documents.

**Current state:** Working local prototype demonstrating the workflow

---

## Next Integration Required

### 1. Document Storage System

**Integration:** Connect to foundation's document management system (DMS)

**What's needed:**
- API endpoint to check document existence
- Document validation service (name matching, signature verification)
- PDF preview capability

**API Requirements:**
```javascript
GET /api/applications/{id}/documents
Response: {
  registration: { exists: true, validated: false, issues: [...] },
  activityPlan: { exists: true, validated: true },
  signoff: { exists: false }
}
```

**Owner:** Backend team + DMS integration specialist

**Access required:**
- DMS API credentials
- Document validation rules documentation
- Test environment with sample PDFs

**Estimated timeline:** 2-3 weeks

---

### 2. Email Service

**Integration:** Connect to organization's email system

**What's needed:**
- SMTP configuration or email API (SendGrid, AWS SES, etc.)
- Email template system
- Delivery confirmation tracking

**Implementation options:**
- Option A: Direct SMTP (simple, no tracking)
- Option B: Email service API (tracking, analytics)

**Owner:** IT operations + backend team

**Access required:**
- Email service credentials
- Approved email templates
- Sender domain verification

**Estimated timeline:** 1 week

---

### 3. Application Portal Integration

**Integration:** Connect to existing applicant portal (if exists)

**What's needed:**
- Webhook to receive resubmission notifications
- Status update API to mark applications as "needs documents"
- Applicant-facing status page

**If no portal exists:**
- Build lightweight submission interface
- Or continue with email-based workflow

**Owner:** Product owner decision + frontend team

**Access required:**
- Portal API documentation
- Authentication system integration

**Estimated timeline:** 3-4 weeks

---

## Access Requirements Summary

| System | Access Type | Who Provides | Critical? |
|--------|-------------|--------------|-----------|
| Document Management System | API Read | DMS Admin | ✅ YES |
| Email Service | SMTP/API Send | IT Ops | ✅ YES |
| Application Portal | Webhook + API | Product Owner | ⚠️ Nice to have |
| User Authentication | SSO/OAuth | IT Security | ✅ YES |
| Database | Read/Write | DBA | ✅ YES |

---

## Owner Assignment

**Recommend this breakdown:**

1. **Product Owner:** Define document validation rules, email templates
2. **Backend Developer:** API integrations, validation logic
3. **Frontend Developer:** UI refinements based on user feedback
4. **DevOps:** Deploy to staging, set up email service
5. **Business Analyst:** Test with real caseworkers, gather feedback

**Current state:** Prototype (no owner assigned)  
**Next state:** Pilot with 2-3 caseworkers

---

## Unresolved Risks

### 🔴 HIGH RISK

**1. Document Validation Complexity**
- **Risk:** Real validation may be more complex than "file exists"
- **Example:** Does signoff have wet signature vs digital vs initials?
- **Mitigation:** Interview caseworkers about current manual checks
- **Owner:** Product + Subject matter expert

**2. Grant Type Variability**
- **Risk:** Different grant programs may require different documents
- **Example:** Youth training vs corporate training have different rules
- **Mitigation:** Build configurable document checklist per grant type
- **Owner:** Product owner

### 🟡 MEDIUM RISK

**3. Email Deliverability**
- **Risk:** Applicant emails may bounce or go to spam
- **Mitigation:** Use authenticated email service, test deliverability
- **Owner:** IT operations

**4. User Adoption**
- **Risk:** Caseworkers may not use system if it's slower than manual email
- **Mitigation:** Time comparison study (manual vs dashboard)
- **Owner:** Business analyst + UX researcher

**5. Document Privacy/Security**
- **Risk:** Sensitive applicant info in documents
- **Mitigation:** Role-based access, audit logging, encrypted storage
- **Owner:** Security team

### 🟢 LOW RISK

**6. UI Responsiveness**
- **Risk:** Dashboard doesn't work well on tablets
- **Mitigation:** CSS already has responsive breakpoints
- **Owner:** Frontend developer

---

## Deployment Recommendations

### Phase 1: Pilot (Week 1-2)
- Deploy to staging environment
- 2-3 volunteer caseworkers
- 5-10 real applications
- Daily feedback sessions

### Phase 2: Limited Release (Week 3-6)
- All caseworkers in one program area
- Full email integration
- Monitor time-to-resolution metrics

### Phase 3: Full Rollout (Week 7+)
- All grant programs
- Applicant-facing status page
- Training materials for new caseworkers

---

## Success Metrics to Track

**Before vs After:**
1. **Time to resolution:** Days from "incomplete" notification to resubmission
2. **Email count:** Avg emails per application before review-ready
3. **Caseworker satisfaction:** "Saves me time" rating
4. **Applicant clarity:** "I know what to fix" rating

**Target improvements:**
- 40% reduction in email back-and-forth
- 60% reduction in time-to-resubmission
- 80%+ caseworker satisfaction

---

## Contact & Handoff

**Prototype delivered:** 2026-09-17  
**Source code location:** [Repository URL]  
**Demo video:** [If recorded]  
**Questions contact:** [Your email]

**Next meeting recommended:** Kickoff with product owner + backend lead within 1 week

---

## Appendices

### A. Current Data Model

See `src/data/initial.json` for data structure

Key entities:
- Application (id, organizationName, status, documents)
- Document (submitted, valid, notes)
- RequiredDocuments list

### B. Technology Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Frontend | React | Team familiarity, fast prototyping |
| State | useState | Simple enough for current scope |
| Styling | Custom CSS | No design system yet, keep flexible |
| Backend | TBD | Depends on existing infrastructure |

### C. Open Questions for Product Owner

1. Should different grant types have different document requirements?
2. What happens if an applicant never resubmits?
3. Who should receive notifications besides the applicant contact?
4. Is there a deadline for document completion?
5. Should we show historical submissions?

---

**END OF HANDOFF**

Recommendation: Schedule 30min review meeting with stakeholders before proceeding to integration phase.
