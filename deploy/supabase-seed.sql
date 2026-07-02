-- ─────────────────────────────────────────────────────────────
-- Signal Meetings — dummy/demo data (Indian owner names)
-- Run in the Supabase SQL Editor AFTER supabase-schema.sql.
-- Idempotent: it clears previous seed rows (ids prefixed *_seed_*) and re-inserts.
-- ─────────────────────────────────────────────────────────────

-- Ensure the server's service_role can read/write (safe to re-run).
grant usage on schema public to service_role;
grant all privileges on table public.meetings     to service_role;
grant all privileges on table public.action_items to service_role;

-- Clean previous seed data (cascade removes their action items).
delete from public.meetings where id like 'mtg_seed_%';

-- Helper expressions used below:
--   ts(n)  = ISO timestamp n days ago
--   due(n) = ISO date n days from today (negative = overdue)

-- ── Meeting 1 ───────────────────────────────────────────────────
insert into public.meetings (id, title, created_at, transcript, source_type, tldr, decisions) values (
  'mtg_seed_1',
  'Q3 Product Launch Sync',
  to_char((now() - interval '2 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'Priya: Let''s lock the Q3 launch. We ship the analytics dashboard to beta on the 15th. Arjun, billing needs to be ready. Ananya, the empty states are blocking engineering. Rohit, please own the pricing page copy.',
  'text',
  'The team locked the analytics dashboard launch: beta on the 15th, GA two weeks later if metrics hold. Billing, design, and pricing copy are the gating items.',
  '["Launch to beta on the 15th; GA two weeks later if metrics hold.", "Pricing stays at three tiers — no free tier for now.", "Delay GA (not beta) if the billing webhook is unstable."]'::jsonb
);

insert into public.action_items
  (id, meeting_id, title, owner, due_date, follow_up, source_quote, confidence, status, confirmed, duplicate_of, created_at, updated_at)
values
  ('itm_seed_1_1','mtg_seed_1','Finish the billing integration for paid plans','Arjun Mehta',(CURRENT_DATE + 4)::text,'Resolve the outstanding webhook edge case before GA.','Arjun, billing needs to be ready.',0.93,'in_progress',true,null,
   to_char((now() - interval '2 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('itm_seed_1_2','mtg_seed_1','Deliver the dashboard empty-state screens','Ananya Iyer',(CURRENT_DATE - 1)::text,'Hand off to engineering to unblock implementation.','Ananya, the empty states are blocking engineering.',0.9,'open',true,null,
   to_char((now() - interval '2 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('itm_seed_1_3','mtg_seed_1','Update the pricing page copy for the three tiers','Rohit Verma',(CURRENT_DATE + 2)::text,'Reflect the three new tiers accurately.','Rohit, please own the pricing page copy.',0.84,'open',true,null,
   to_char((now() - interval '2 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('itm_seed_1_4','mtg_seed_1','Run an accessibility audit on the new dashboard','Ananya Iyer',(CURRENT_DATE + 9)::text,'Complete before GA.','run a quick accessibility pass on the new dashboard before GA',0.72,'open',true,null,
   to_char((now() - interval '2 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('itm_seed_1_5','mtg_seed_1','Draft the customer launch announcement email','Priya Sharma',(CURRENT_DATE + 5)::text,'Send to marketing for review.','I''ll write the launch announcement draft and send it to marketing.',0.68,'done',true,null,
   to_char((now() - interval '2 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));

-- ── Meeting 2 ───────────────────────────────────────────────────
insert into public.meetings (id, title, created_at, transcript, source_type, tldr, decisions) values (
  'mtg_seed_2',
  'Mobile App Redesign Review',
  to_char((now() - interval '5 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'Kavya: The new navigation tested well. Vikram will finalize the design tokens. Neha to migrate the onboarding screens. We agreed to ship dark mode in this release.',
  'audio',
  'Redesign is on track: navigation validated in testing, design tokens being finalized, onboarding screens migrating. Dark mode ships this release.',
  '["Ship dark mode in this release.", "Adopt the new bottom-navigation pattern app-wide."]'::jsonb
);

insert into public.action_items
  (id, meeting_id, title, owner, due_date, follow_up, source_quote, confidence, status, confirmed, duplicate_of, created_at, updated_at)
values
  ('itm_seed_2_1','mtg_seed_2','Finalize the design token system','Vikram Nair',(CURRENT_DATE + 1)::text,'Publish to the shared Figma library.','Vikram will finalize the design tokens.',0.91,'in_progress',true,null,
   to_char((now() - interval '5 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('itm_seed_2_2','mtg_seed_2','Migrate the onboarding screens to the new nav','Neha Gupta',(CURRENT_DATE + 6)::text,null,'Neha to migrate the onboarding screens.',0.86,'open',true,null,
   to_char((now() - interval '5 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('itm_seed_2_3','mtg_seed_2','Implement dark mode theming','Kavya Reddy',(CURRENT_DATE - 2)::text,'Coordinate tokens with Vikram.','We agreed to ship dark mode in this release.',0.79,'in_progress',true,null,
   to_char((now() - interval '5 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('itm_seed_2_4','mtg_seed_2','Schedule a follow-up usability test','Neha Gupta',null,'Recruit 5 participants.','let''s run another usability test after the migration',0.55,'open',false,null,
   to_char((now() - interval '5 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));

-- ── Meeting 3 ───────────────────────────────────────────────────
insert into public.meetings (id, title, created_at, transcript, source_type, tldr, decisions) values (
  'mtg_seed_3',
  'Customer Onboarding Retro',
  to_char((now() - interval '9 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'Aditya: Activation dropped last month. Sneha will rewrite the welcome sequence. Karthik to instrument funnel analytics. We decided to add an in-app checklist.',
  'text',
  'Activation dipped; the team will rewrite the welcome sequence, instrument the funnel, and add an in-app onboarding checklist.',
  '["Add an in-app onboarding checklist.", "Rewrite the welcome email sequence."]'::jsonb
);

insert into public.action_items
  (id, meeting_id, title, owner, due_date, follow_up, source_quote, confidence, status, confirmed, duplicate_of, created_at, updated_at)
values
  ('itm_seed_3_1','mtg_seed_3','Rewrite the welcome email sequence','Sneha Kulkarni',(CURRENT_DATE - 3)::text,'A/B test subject lines.','Sneha will rewrite the welcome sequence.',0.88,'done',true,null,
   to_char((now() - interval '9 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('itm_seed_3_2','mtg_seed_3','Instrument onboarding funnel analytics','Karthik Menon',(CURRENT_DATE + 3)::text,'Track step-by-step drop-off.','Karthik to instrument funnel analytics.',0.9,'in_progress',true,null,
   to_char((now() - interval '9 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('itm_seed_3_3','mtg_seed_3','Build the in-app onboarding checklist','Aditya Rao',(CURRENT_DATE + 8)::text,null,'We decided to add an in-app checklist.',0.83,'open',true,null,
   to_char((now() - interval '9 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('itm_seed_3_4','mtg_seed_3','Review activation metrics next sprint','Aditya Rao',(CURRENT_DATE + 12)::text,null,'we should review activation again next sprint',0.6,'open',true,null,
   to_char((now() - interval '9 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));

-- ── Meeting 4 ───────────────────────────────────────────────────
insert into public.meetings (id, title, created_at, transcript, source_type, tldr, decisions) values (
  'mtg_seed_4',
  'Infrastructure & Cost Planning',
  to_char((now() - interval '14 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'Ishaan: Cloud spend is up 30%. Meera will right-size the staging clusters. Rohit to migrate logging to the cheaper tier. We agreed to set budget alerts.',
  'text',
  'Cloud spend rose 30%. Plan: right-size staging, move logging to a cheaper tier, and add budget alerts.',
  '["Set budget alerts at 80% of monthly cap.", "Move logging to the cheaper retention tier."]'::jsonb
);

insert into public.action_items
  (id, meeting_id, title, owner, due_date, follow_up, source_quote, confidence, status, confirmed, duplicate_of, created_at, updated_at)
values
  ('itm_seed_4_1','mtg_seed_4','Right-size the staging clusters','Meera Joshi',(CURRENT_DATE - 4)::text,'Report savings after one week.','Meera will right-size the staging clusters.',0.92,'done',true,null,
   to_char((now() - interval '14 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('itm_seed_4_2','mtg_seed_4','Migrate logging to the cheaper retention tier','Rohit Verma',(CURRENT_DATE + 2)::text,null,'Rohit to migrate logging to the cheaper tier.',0.87,'in_progress',true,null,
   to_char((now() - interval '14 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('itm_seed_4_3','mtg_seed_4','Set up monthly budget alerts','Ishaan Kapoor',(CURRENT_DATE + 1)::text,'Alert at 80% of cap.','We agreed to set budget alerts.',0.85,'done',true,null,
   to_char((now() - interval '14 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
