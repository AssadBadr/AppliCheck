-- Insert default demo applications
-- Run this in Supabase SQL Editor to set up the two default applications

-- Only insert if they don't already exist
INSERT INTO grant_applications (
  organization_name,
  applicant_name,
  contact_email,
  status,
  registration_url,
  registration_valid,
  registration_notes,
  activity_plan_url,
  activity_plan_valid,
  activity_plan_notes,
  responsible_person_signoff_url,
  signoff_valid,
  signoff_notes,
  submitted_at
)
SELECT 
  'Learning Workshop A',
  'Learning Workshop A',
  'contact@learningworkshopa.org',
  'under_review',
  'https://placeholder.com/registration.pdf',
  true,
  '',
  'https://placeholder.com/activity_plan.pdf',
  true,
  '',
  null,
  false,
  'Document not provided',
  '2026-09-10T14:30:00Z'
WHERE NOT EXISTS (
  SELECT 1 FROM grant_applications WHERE organization_name = 'Learning Workshop A'
);

INSERT INTO grant_applications (
  organization_name,
  applicant_name,
  contact_email,
  status,
  registration_url,
  registration_valid,
  registration_notes,
  activity_plan_url,
  activity_plan_valid,
  activity_plan_notes,
  responsible_person_signoff_url,
  signoff_valid,
  signoff_notes,
  submitted_at
)
SELECT 
  'Community Workshop B',
  'Community Workshop B',
  'admin@communityworkshopb.org',
  'under_review',
  'https://placeholder.com/registration_wrong.pdf',
  false,
  'Name mismatch: Document says ''Community Workshop C'' but application is for ''Community Workshop B''',
  null,
  false,
  'Document not provided',
  null,
  false,
  'Document not provided',
  '2026-09-12T09:15:00Z'
WHERE NOT EXISTS (
  SELECT 1 FROM grant_applications WHERE organization_name = 'Community Workshop B'
);
