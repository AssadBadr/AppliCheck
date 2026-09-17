-- Run this in Supabase SQL Editor after schema_minimal.sql

-- Notifications / feedback messages from caseworker to applicant
create table if not exists application_notifications (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references grant_applications(id) on delete cascade,
  subject        text not null,
  body           text not null,
  sent_at        timestamptz not null default now()
);

alter table application_notifications enable row level security;
create policy "public_insert_notif" on application_notifications for insert with check (true);
create policy "public_select_notif" on application_notifications for select using (true);
