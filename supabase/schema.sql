-- ============================================================
-- C07 Grant Application Dashboard - Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. GRANT APPLICATIONS TABLE
create table if not exists grant_applications (
  id               uuid primary key default gen_random_uuid(),
  applicant_name   text not null,
  organization_name text not null,
  contact_email    text not null,

  -- Document file URLs (from Supabase Storage)
  registration_url              text,
  activity_plan_url             text,
  responsible_person_signoff_url text,

  -- Caseworker validation fields (set by caseworker, not applicant)
  registration_valid            boolean default false,
  registration_notes            text default '',
  activity_plan_valid           boolean default false,
  activity_plan_notes           text default '',
  signoff_valid                 boolean default false,
  signoff_notes                 text default '',

  status           text not null default 'under_review',  -- under_review | review_ready | approved | rejected
  submitted_at     timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 2. AUTO-UPDATE updated_at ON ROW CHANGE
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger grant_applications_updated_at
  before update on grant_applications
  for each row execute function update_updated_at();

-- 3. ROW LEVEL SECURITY
alter table grant_applications enable row level security;

-- Anyone can insert (submit an application)
create policy "Anyone can submit application"
  on grant_applications for insert
  with check (true);

-- Anyone can read (for demo / caseworker view)
create policy "Anyone can read applications"
  on grant_applications for select
  using (true);

-- Anyone can update (for caseworker validation + applicant resubmit)
create policy "Anyone can update application"
  on grant_applications for update
  using (true);

-- 4. STORAGE BUCKET
-- Run this after creating the table.
-- In Supabase Dashboard > Storage > New Bucket:
--   Name: grant-documents
--   Public: true
--
-- Or run via SQL:
insert into storage.buckets (id, name, public)
values ('grant-documents', 'grant-documents', true)
on conflict do nothing;

-- Allow anyone to upload to the bucket (for demo)
create policy "Anyone can upload documents"
  on storage.objects for insert
  with check (bucket_id = 'grant-documents');

-- Allow anyone to read documents
create policy "Anyone can read documents"
  on storage.objects for select
  using (bucket_id = 'grant-documents');

-- 5. SEED DATA (optional — mirrors the initial.json demo data)
-- You can run this to pre-populate the caseworker dashboard.
insert into grant_applications (
  id,
  applicant_name,
  organization_name,
  contact_email,
  registration_url,
  registration_valid,
  registration_notes,
  activity_plan_url,
  activity_plan_valid,
  activity_plan_notes,
  responsible_person_signoff_url,
  signoff_valid,
  signoff_notes,
  status,
  submitted_at
) values
(
  '00000000-0000-0000-0000-000000000001',
  'Alice Martin',
  'Learning Workshop A',
  'contact@learningworkshopa.org',
  'https://placeholder.com/reg-a.pdf',  -- replace with real Storage URL after upload
  true,
  '',
  'https://placeholder.com/plan-a.pdf',
  true,
  '',
  null,
  false,
  'Document not provided',
  'under_review',
  '2026-09-10T14:30:00Z'
),
(
  '00000000-0000-0000-0000-000000000002',
  'Bob Hassan',
  'Community Workshop B',
  'admin@communityworkshopb.org',
  'https://placeholder.com/reg-b.pdf',
  false,
  'Name mismatch: document says "Community Workshop C" but application is for "Community Workshop B"',
  null,
  false,
  'Document not provided',
  null,
  false,
  'Document not provided',
  'under_review',
  '2026-09-12T09:15:00Z'
)
on conflict (id) do nothing;
