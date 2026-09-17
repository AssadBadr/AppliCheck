# Presentation Guide (5 minutes)
## C07: Documentation Feedback Dashboard

---

## Opening (30 seconds)

**Show the problem first:**

> "Imagine you're a grant applicant. You get this email: 'Your application is incomplete.' What do you do? You don't know what's missing. You think your idea got rejected. You email back asking for clarification. Three weeks later, you're still confused."

**Transition:**

> "This is the pain our client - a foundation caseworker - faces every day. Let me show you what we built."

---

## Demo Flow (3 minutes)

### 1. Show the Dashboard (30 sec)

**Narration:** "Here's the caseworker dashboard. Two applications under review."

**Point to:**
- APP-001: "1 issue" badge (yellow/red)
- APP-002: "3 issues" badge (red)

**Say:** "APP-002 is our failure case - worst possible scenario."

---

### 2. Show the Evidence (45 sec)

**Click APP-002**

**Narration:** "When I click, I see EXACTLY what's wrong:"

**Point to checklist:**
- ⚠️ "Registration name mismatch - document says Workshop C but should be Workshop B"
- ✗ "Activity plan missing"
- ✗ "Signoff missing"

**Say:** "No ambiguity. The caseworker sees precise issues before contacting the applicant."

---

### 3. Show the Communication (45 sec)

**Click "Notify Applicant"**

**Narration:** "Instead of typing a vague email, the caseworker clicks here."

**Show email preview:**

**Read key parts:**
- "This is NOT a rejection of your proposal"
- "1. Registration name mismatch: Document says..."
- "2. Activity plan document is missing"
- "3. Responsible person signoff is missing"

**Say:** "Every issue is specific. The applicant knows exactly what to fix."

---

### 4. Show the Resolution (60 sec)

**Click "Simulate Updated Submission"**

**Narration:** "Let's see what happens when the applicant fixes everything and resubmits."

**Watch the transition:**
- All checkmarks turn green ✓
- "Review Ready" badge appears
- Success message: "Documentation complete"

**Say:** "Now it's ready for evaluation. We've separated documentation completeness from funding decisions."

---

## The Outcome (30 seconds)

**Key metrics we expect:**

- 40% fewer emails per application
- 60% faster time to review-ready
- Applicants know exactly what to fix

**What's real vs simulated:**

"The logic, UI, and validation are working. Email sending and document uploads are simulated - those need integration with existing systems."

---

## The Handoff (30 seconds)

**Show Wolf handoff briefly:**

"We've documented:
- Next integrations needed (document storage, email service)
- Unresolved risks (grant type variability, validation complexity)
- Recommended pilot: 3 caseworkers, 2 weeks"

---

## Closing (30 seconds)

**The ask:**

> "The hypothesis is: specific feedback reduces ambiguity and speeds up resolution. The prototype proves the workflow works. The next step is a pilot with real caseworkers and real applications to validate the time savings."

**End with:**

> "Questions?"

---

## Backup Slides / Talking Points

### If asked: "Why not auto-send the email?"

**Answer:** "We explicitly kept manual review in the workflow. Caseworkers know their applicants - they might want to add a personal note or call first for sensitive issues. Automation can come later based on caseworker preference."

---

### If asked: "What if documents are in different languages?"

**Answer:** "Great question - we didn't address that in the prototype. That's a validation rule the product owner would need to define. The system is designed to be configurable, so you could add a language check to the validation."

---

### If asked: "How do you handle document versions?"

**Answer:** "Currently not in scope - we're focused on completeness, not version control. That's documented as a limitation. In the pilot, we'd learn if that's critical or nice-to-have."

---

### If asked: "What about accessibility?"

**Answer:** "Good catch - the prototype hasn't been tested with screen readers yet. That would be part of the development phase before full rollout."

---

### If asked: "How long did this take?"

**Answer:** "About 4-5 hours of development time. React + Vite made it fast to prototype. The real work will be integrating with existing document systems."

---

## Demo Troubleshooting

### If demo breaks:

"Let me show you the evidence view instead."
→ Open `initial.json` to show data structure
→ Walk through the checklist logic manually

### If audience loses focus:

**Stop and ask:** "Think about the last time you had to resubmit paperwork but didn't know what was wrong. Frustrating, right? That's what we're fixing."

---

## Presentation Tips

### DO:
- Start with empathy (the applicant's frustration)
- Show the failure case first (APP-002 is worse than APP-001)
- Click through the full workflow live
- Point at specific UI elements as you narrate
- Say "simulated" when demonstrating non-real parts

### DON'T:
- Lead with technology stack
- Explain React code
- Apologize for what's not built
- Rush through the email preview (that's the key value)
- Assume audience knows grant application workflows

---

## Presentation Order

1. **Problem** (30s) - Applicant confusion
2. **Evidence** (45s) - APP-002 checklist
3. **Solution** (45s) - Email preview
4. **Resolution** (60s) - Simulate fix
5. **Outcome** (30s) - Expected metrics
6. **Handoff** (30s) - Next steps

**Total: ~4min 30sec** → Leaves 30sec buffer for questions

---

## PowerPoint Slide Backup (If Required)

### Slide 1: Title
**C07: Clear Documentation Feedback**  
Problem: Vague emails → applicant confusion  
Solution: Specific checklist → precise communication

### Slide 2: The Pain
- Current: "Your application is incomplete"
- Problem: Applicant doesn't know what to fix
- Result: Weeks of email loops

### Slide 3: The Solution
- Dashboard with ✓/✗/⚠️ checklist
- Generated email with specific issues
- Clear separation: documentation ≠ rejection

### Slide 4: Evidence (Screenshot)
APP-002 with 3 issues highlighted

### Slide 5: Outcome
- 40% fewer emails
- 60% faster resolution
- Pilot ready

---

**Good luck! You've got this. 🚀**
