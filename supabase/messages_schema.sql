-- Full two-way messaging system between applicants and foundation
-- Run this in Supabase SQL Editor

-- Drop old table if it exists
drop table if exists application_notifications cascade;

-- Messages table supporting two-way communication
create table if not exists messages (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references grant_applications(id) on delete cascade,
  sender_type    text not null check (sender_type in ('applicant', 'foundation')),
  sender_name    text not null,
  subject        text not null,
  body           text not null,
  read           boolean default false,
  sent_at        timestamptz not null default now()
);

-- Index for faster queries
create index if not exists idx_messages_app_id on messages(application_id);
create index if not exists idx_messages_sent_at on messages(sent_at desc);

-- RLS policies
alter table messages enable row level security;

create policy "public_insert_messages" 
  on messages for insert 
  with check (true);

create policy "public_select_messages" 
  on messages for select 
  using (true);

create policy "public_update_messages" 
  on messages for update 
  using (true);

-- Message templates (optional helper table for pre-written messages)
create table if not exists message_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  subject     text not null,
  body        text not null,
  created_at  timestamptz default now()
);

alter table message_templates enable row level security;

create policy "public_select_templates" 
  on message_templates for select 
  using (true);

-- Insert default templates
insert into message_templates (name, subject, body) values
  ('application_received', 
   'Application Received - Reference #{{ref_id}}',
   'Dear {{applicant_name}},

Thank you for submitting your grant application. We have received your application and assigned it reference number #{{ref_id}}.

Our team will review your submission and get back to you within 5-7 business days.

What happens next:
• Document verification (2-3 days)
• Committee review (3-5 days)
• Final decision notification

You can track your application status and receive updates through this inbox.

Best regards,
The Foundation Team'),
  
  ('documents_needed', 
   'Additional Documents Required - Ref #{{ref_id}}',
   'Dear {{applicant_name}},

We are reviewing your application (Ref #{{ref_id}}) and need additional documentation to proceed.

Please provide:
{{document_list}}

You can resubmit documents through your application portal.

Once we receive these documents, we will continue processing your application.

Best regards,
The Foundation Team'),
  
  ('application_approved', 
   '✅ Application Approved - Ref #{{ref_id}}',
   'Dear {{applicant_name}},

Congratulations! Your grant application (Ref #{{ref_id}}) has been APPROVED.

Grant Amount: {{amount}}
Next Steps: {{next_steps}}

Our team will contact you within 2-3 business days to finalize the grant agreement and discuss disbursement details.

Thank you for your commitment to making a positive impact in our community.

Best regards,
The Foundation Team'),
  
  ('application_rejected', 
   'Application Status Update - Ref #{{ref_id}}',
   'Dear {{applicant_name}},

Thank you for submitting your grant application (Ref #{{ref_id}}).

After careful review by our committee, we regret to inform you that your application has not been selected for funding at this time.

Reason: {{reason}}

We encourage you to:
• Review our current funding priorities
• Consider reapplying in the next funding cycle
• Contact us if you have questions about this decision

We appreciate your interest and wish you success in your future endeavors.

Best regards,
The Foundation Team'),
  
  ('request_clarification', 
   'Clarification Needed - Ref #{{ref_id}}',
   'Dear {{applicant_name}},

We have a question about your application (Ref #{{ref_id}}):

{{question}}

Please reply to this message with the requested information so we can continue processing your application.

Best regards,
The Foundation Team')
on conflict (name) do nothing;
