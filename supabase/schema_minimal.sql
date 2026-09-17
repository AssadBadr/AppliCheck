-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Table
create table if not exists grant_applications (
  id                              uuid primary key default gen_random_uuid(),
  applicant_name                  text not null,
  organization_name               text not null,
  contact_email                   text not null,
  registration_url                text,
  activity_plan_url               text,
  responsible_person_signoff_url  text,
  registration_valid              boolean default false,
  registration_notes              text default '',
  activity_plan_valid             boolean default false,
  activity_plan_notes             text default '',
  signoff_valid                   boolean default false,
  signoff_notes                   text default '',
  status                          text not null default 'under_review',
  submitted_at                    timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

-- 2. RLS
alter table grant_applications enable row level security;
create policy "public_insert" on grant_applications for insert with check (true);
create policy "public_select" on grant_applications for select using (true);
create policy "public_update" on grant_applications for update using (true);

-- 3. Storage bucket
insert into storage.buckets (id, name, public)
values ('grant-documents', 'grant-documents', true)
on conflict do nothing;

create policy "public_upload" on storage.objects for insert with check (bucket_id = 'grant-documents');
create policy "public_read"   on storage.objects for select using (bucket_id = 'grant-documents');
