import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { writeFileSync, mkdirSync } from 'fs'

const out = './public/demo-docs'
mkdirSync(out, { recursive: true })

const PURPLE = rgb(0.4, 0.44, 0.92)
const DARK   = rgb(0.08, 0.08, 0.18)
const GRAY   = rgb(0.44, 0.44, 0.55)
const LINE   = rgb(0.87, 0.87, 0.93)
const WHITE  = rgb(1, 1, 1)

async function addFormField(pdfDoc, page, font, { label, x, y, width = 380, value = '' }) {
  const form = pdfDoc.getForm()

  // Label
  page.drawText(label, { x, y: y + 16, size: 9, font, color: GRAY })

  // Field background
  page.drawRectangle({ x, y: y - 22, width, height: 28, color: rgb(0.97, 0.97, 0.99), borderColor: LINE, borderWidth: 1.5, opacity: 1 })

  // Pre-filled hint text
  if (value) {
    page.drawText(value, { x: x + 8, y: y - 12, size: 11, font, color: DARK })
  }

  // Actual editable text field
  const field = form.createTextField(`field_${label.replace(/\s+/g, '_')}`)
  field.setText(value)
  field.addToPage(page, { x, y: y - 22, width, height: 28 })
  field.enableMultiline(false)
  field.setFontSize(11)
}

async function makeHeader(page, font, boldFont, title, subtitle, width) {
  // Header bar
  page.drawRectangle({ x: 0, y: 792, width, height: 55, color: PURPLE })
  page.drawText('AppliCheck', { x: 40, y: 826, size: 13, font: boldFont, color: WHITE })
  page.drawText('Grant Application Portal', { x: 40, y: 810, size: 9, font, color: rgb(0.85, 0.85, 1) })

  // Title
  page.drawText(title, { x: 40, y: 755, size: 18, font: boldFont, color: DARK })
  page.drawRectangle({ x: 40, y: 748, width: 80, height: 3, color: PURPLE })
  if (subtitle) {
    page.drawText(subtitle, { x: 40, y: 730, size: 10, font, color: GRAY })
  }
}

// ── 1. Registration Document ─────────────────────────────────────────────────
async function makeRegistration() {
  const pdfDoc = await PDFDocument.create()
  const font   = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const page   = pdfDoc.addPage([595, 842])
  const { width } = page.getSize()

  await makeHeader(page, font, bold, 'Organisation Registration Document', 'Complete all fields and attach to your grant application', width)

  page.drawText('ORGANISATION DETAILS', { x: 40, y: 700, size: 10, font: bold, color: PURPLE })
  page.drawRectangle({ x: 40, y: 696, width: width - 80, height: 1, color: LINE })

  const fields = [
    { label: 'Legal Organisation Name *', y: 668, value: 'Community Workshop B' },
    { label: 'Registration Number *',     y: 610, value: 'CWB-2024-00142' },
    { label: 'Legal Status (e.g. Non-Profit, Association) *', y: 552, value: 'Non-Profit Association' },
    { label: 'Date of Registration *',    y: 494, value: '14 March 2024' },
    { label: 'Registered Address *',      y: 436, value: '12 Rue des Acacias, 75011 Paris' },
    { label: 'Issuing Authority *',       y: 378, value: 'Prefecture de Paris' },
    { label: 'Country of Registration *', y: 320, value: 'France' },
  ]

  for (const f of fields) {
    await addFormField(pdfDoc, page, font, { label: f.label, x: 40, y: f.y, width: width - 80, value: f.value })
  }

  page.drawText('DECLARATION', { x: 40, y: 270, size: 10, font: bold, color: PURPLE })
  page.drawRectangle({ x: 40, y: 266, width: width - 80, height: 1, color: LINE })
  page.drawText('I certify that the information above is accurate and that this organisation is legally registered.', { x: 40, y: 248, size: 9, font, color: GRAY })

  await addFormField(pdfDoc, page, font, { label: 'Authorised Representative Name *', x: 40, y: 218, width: 250, value: 'Sophie Laurent' })
  await addFormField(pdfDoc, page, font, { label: 'Date *', x: 310, y: 218, width: 200, value: '17 September 2026' })

  page.drawText('Signature:', { x: 40, y: 170, size: 9, font, color: GRAY })
  page.drawRectangle({ x: 40, y: 140, width: 250, height: 28, color: rgb(0.97, 0.97, 0.99), borderColor: LINE, borderWidth: 1.5 })

  // Footer
  page.drawRectangle({ x: 0, y: 0, width, height: 40, color: rgb(0.97, 0.97, 0.99) })
  page.drawText('AppliCheck · Grant Application Portal · For demonstration purposes', { x: 40, y: 15, size: 8, font, color: GRAY })

  writeFileSync(`${out}/registration.pdf`, await pdfDoc.save())
  console.log('✓ registration.pdf')
}

// ── 2. Activity Plan ──────────────────────────────────────────────────────────
async function makeActivityPlan() {
  const pdfDoc = await PDFDocument.create()
  const font   = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const page   = pdfDoc.addPage([595, 842])
  const { width } = page.getSize()

  await makeHeader(page, font, bold, 'Activity Plan', 'Describe your planned activities, outcomes and budget for the grant period', width)

  page.drawText('ORGANISATION & PERIOD', { x: 40, y: 700, size: 10, font: bold, color: PURPLE })
  page.drawRectangle({ x: 40, y: 696, width: width - 80, height: 1, color: LINE })

  await addFormField(pdfDoc, page, font, { label: 'Organisation Name *', x: 40, y: 668, width: 240, value: 'Community Workshop B' })
  await addFormField(pdfDoc, page, font, { label: 'Grant Period *', x: 300, y: 668, width: 210, value: 'Jan 2026 – Dec 2027' })

  page.drawText('PLANNED ACTIVITIES', { x: 40, y: 618, size: 10, font: bold, color: PURPLE })
  page.drawRectangle({ x: 40, y: 614, width: width - 80, height: 1, color: LINE })

  // Multi-line text area simulation
  page.drawText('Describe your activities (one per line) *', { x: 40, y: 598, size: 9, font, color: GRAY })
  page.drawRectangle({ x: 40, y: 510, width: width - 80, height: 82, color: rgb(0.97, 0.97, 0.99), borderColor: LINE, borderWidth: 1.5 })
  const form = pdfDoc.getForm()
  const actField = form.createTextField('activities')
  actField.setText('1. Deliver 12 digital literacy workshops\n2. Train 200 participants in computing skills\n3. Partner with 3 local schools for after-school programmes')
  actField.enableMultiline(true)
  actField.addToPage(page, { x: 40, y: 510, width: width - 80, height: 82 })

  page.drawText('EXPECTED OUTCOMES', { x: 40, y: 488, size: 10, font: bold, color: PURPLE })
  page.drawRectangle({ x: 40, y: 484, width: width - 80, height: 1, color: LINE })

  page.drawText('Expected outcomes *', { x: 40, y: 468, size: 9, font, color: GRAY })
  page.drawRectangle({ x: 40, y: 400, width: width - 80, height: 62, color: rgb(0.97, 0.97, 0.99), borderColor: LINE, borderWidth: 1.5 })
  const outField = form.createTextField('outcomes')
  outField.setText('- 80% of participants gain recognised digital qualification\n- Reduction in digital exclusion in target areas by 15%')
  outField.enableMultiline(true)
  outField.addToPage(page, { x: 40, y: 400, width: width - 80, height: 62 })

  page.drawText('BUDGET SUMMARY', { x: 40, y: 375, size: 10, font: bold, color: PURPLE })
  page.drawRectangle({ x: 40, y: 371, width: width - 80, height: 1, color: LINE })

  await addFormField(pdfDoc, page, font, { label: 'Total Budget Requested (EUR) *', x: 40,  y: 343, width: 220, value: '48,500' })
  await addFormField(pdfDoc, page, font, { label: 'Staff Costs (EUR)',               x: 280, y: 343, width: 230, value: '28,000' })
  await addFormField(pdfDoc, page, font, { label: 'Materials & Equipment (EUR)',      x: 40,  y: 285, width: 220, value: '12,500' })
  await addFormField(pdfDoc, page, font, { label: 'Venue & Logistics (EUR)',          x: 280, y: 285, width: 230, value: '8,000' })

  await addFormField(pdfDoc, page, font, { label: 'Prepared by *', x: 40, y: 227, width: 240, value: 'Sophie Laurent' })
  await addFormField(pdfDoc, page, font, { label: 'Date *',        x: 300, y: 227, width: 210, value: '17 September 2026' })

  page.drawRectangle({ x: 0, y: 0, width, height: 40, color: rgb(0.97, 0.97, 0.99) })
  page.drawText('AppliCheck · Grant Application Portal · For demonstration purposes', { x: 40, y: 15, size: 8, font, color: GRAY })

  writeFileSync(`${out}/activity_plan.pdf`, await pdfDoc.save())
  console.log('✓ activity_plan.pdf')
}

// ── 3. Signoff ────────────────────────────────────────────────────────────────
async function makeSignoff() {
  const pdfDoc = await PDFDocument.create()
  const font   = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const page   = pdfDoc.addPage([595, 842])
  const { width } = page.getSize()

  await makeHeader(page, font, bold, 'Authorised Signatory Declaration', 'To be completed by a person with authority to bind the organisation', width)

  page.drawText('ORGANISATION', { x: 40, y: 700, size: 10, font: bold, color: PURPLE })
  page.drawRectangle({ x: 40, y: 696, width: width - 80, height: 1, color: LINE })

  await addFormField(pdfDoc, page, font, { label: 'Organisation Name *', x: 40, y: 668, width: width - 80, value: 'Community Workshop B' })
  await addFormField(pdfDoc, page, font, { label: 'Application Reference (leave blank if unknown)', x: 40, y: 610, width: width - 80, value: '' })

  page.drawText('DECLARATION', { x: 40, y: 565, size: 10, font: bold, color: PURPLE })
  page.drawRectangle({ x: 40, y: 561, width: width - 80, height: 1, color: LINE })

  const decl = [
    'I, the undersigned, hereby declare that:',
    '',
    '1.  I am duly authorised to act on behalf of the organisation named above.',
    '2.  All information provided in this application is accurate and complete.',
    '3.  The organisation meets all eligibility criteria for this grant programme.',
    '4.  Grant funds will be used solely for the purposes stated in the Activity Plan.',
    '5.  I will notify the foundation immediately of any material changes to this application.',
  ]
  let ty = 543
  for (const line of decl) {
    page.drawText(line, { x: 40, y: ty, size: 10, font: line === decl[0] ? bold : font, color: line === decl[0] ? DARK : GRAY })
    ty -= 18
  }

  page.drawText('SIGNATORY DETAILS', { x: 40, y: 420, size: 10, font: bold, color: PURPLE })
  page.drawRectangle({ x: 40, y: 416, width: width - 80, height: 1, color: LINE })

  await addFormField(pdfDoc, page, font, { label: 'Full Name *',  x: 40,  y: 388, width: 240, value: 'Sophie Laurent' })
  await addFormField(pdfDoc, page, font, { label: 'Job Title *',  x: 300, y: 388, width: 210, value: 'Executive Director' })
  await addFormField(pdfDoc, page, font, { label: 'Email *',      x: 40,  y: 330, width: 240, value: 'sophie@communityworkshopb.org' })
  await addFormField(pdfDoc, page, font, { label: 'Date *',       x: 300, y: 330, width: 210, value: '17 September 2026' })

  page.drawText('Signature *', { x: 40, y: 283, size: 9, font, color: GRAY })
  page.drawRectangle({ x: 40, y: 240, width: 280, height: 38, color: rgb(0.97, 0.97, 0.99), borderColor: LINE, borderWidth: 1.5 })
  page.drawText('(sign here)', { x: 120, y: 255, size: 10, font, color: rgb(0.8, 0.8, 0.85) })

  page.drawText('Official Stamp (if applicable)', { x: 350, y: 283, size: 9, font, color: GRAY })
  page.drawRectangle({ x: 350, y: 240, width: 160, height: 38, color: rgb(0.97, 0.97, 0.99), borderColor: LINE, borderWidth: 1.5 })

  page.drawRectangle({ x: 0, y: 0, width, height: 40, color: rgb(0.97, 0.97, 0.99) })
  page.drawText('AppliCheck · Grant Application Portal · For demonstration purposes', { x: 40, y: 15, size: 8, font, color: GRAY })

  writeFileSync(`${out}/signoff.pdf`, await pdfDoc.save())
  console.log('✓ signoff.pdf')
}

await makeRegistration()
await makeActivityPlan()
await makeSignoff()
console.log('\n✅ All 3 demo PDFs generated in public/demo-docs/')
