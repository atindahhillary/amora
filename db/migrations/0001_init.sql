-- Amora Season 1 schema.
-- Design rules baked in here:
--   * identity data lives in its own table and never stores ID images or raw ID numbers
--   * every penalty to a member's Standing starts as 'proposed' and needs a human to apply it
--   * ethnicity / tribe is never collected; dealbreakers are self-declared

create extension if not exists pgcrypto;

create table members (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  first_name text not null,
  birth_date date not null,
  gender text not null check (gender in ('woman', 'man')),
  seeking text not null check (seeking in ('woman', 'man')),
  pref_age_min int not null,
  pref_age_max int not null check (pref_age_max >= pref_age_min),
  city text not null default 'Nairobi',
  role text not null default 'member' check (role in ('member', 'admin')),
  consented_at timestamptz not null,
  phone_verified_at timestamptz,
  fee_paid_at timestamptz,
  id_verified_at timestamptz,
  questionnaire_done_at timestamptz,
  dealbreakers text[] not null default '{}',
  voice_done_at timestamptz,
  profile_draft text,
  profile_bio text,
  profile_approved_at timestamptz,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'waitlisted', 'rejected')),
  reviewed_at timestamptz,
  account_status text not null default 'active'
    check (account_status in ('active', 'paused', 'removed', 'exited')),
  trusted_contact_name text,
  trusted_contact_phone text,
  created_at timestamptz not null default now()
);

create table otp_codes (
  id bigserial primary key,
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index otp_codes_phone_idx on otp_codes (phone, created_at desc);

create table sessions (
  token_hash text primary key,
  member_id uuid not null references members (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Payments outlive account deletion (financial records must be retained); the member link is dropped.
create table payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members (id) on delete set null,
  kind text not null check (kind in ('application_fee', 'season_pass')),
  amount_kes int not null check (amount_kes > 0),
  phone text not null,
  provider text not null,
  checkout_request_id text unique,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refund_requested', 'refunded')),
  receipt text,
  result_desc text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table seasons (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members (id) on delete cascade,
  payment_id uuid references payments (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  exit_reason text check (exit_reason in ('met_someone', 'taking_a_break', 'not_for_me')),
  exit_choice text check (exit_choice in ('partial_refund', 'gift_season')),
  gift_code text unique,
  exited_at timestamptz
);

-- Kept apart from members. Holds the verification outcome only: no images, no ID number.
-- id_number_hash is an HMAC so duplicate accounts are caught without storing the number.
create table identity_checks (
  member_id uuid primary key references members (id) on delete cascade,
  provider text not null,
  job_id text not null,
  result text not null check (result in ('pending', 'passed', 'failed')),
  id_number_hash text unique,
  checked_at timestamptz not null default now()
);

create table answers (
  member_id uuid not null references members (id) on delete cascade,
  question_id text not null,
  value int not null,
  primary key (member_id, question_id)
);

create table voice_intros (
  member_id uuid primary key references members (id) on delete cascade,
  mime text not null,
  audio bytea not null,
  created_at timestamptz not null default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  member_a uuid not null references members (id) on delete cascade,
  member_b uuid not null references members (id) on delete cascade,
  score int not null,
  pillars jsonb not null,
  why text not null,
  drop_at timestamptz not null,
  a_response text check (a_response in ('accept', 'pass', 'save')),
  b_response text check (b_response in ('accept', 'pass', 'save')),
  approved_by uuid references members (id) on delete set null,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  check (member_a < member_b),
  unique (member_a, member_b)
);
create index matches_drop_idx on matches (drop_at);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references matches (id) on delete cascade,
  opened_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'open'
    check (status in ('open', 'date_planned', 'closed', 'expired')),
  closed_by uuid references members (id) on delete set null,
  close_kind text check (close_kind in ('respectful', 'safety')),
  close_message text,
  closed_at timestamptz
);

create table conversation_listens (
  conversation_id uuid not null references conversations (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  listened_at timestamptz not null default now(),
  primary key (conversation_id, member_id)
);

create table prompt_answers (
  conversation_id uuid not null references conversations (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  prompt_index int not null check (prompt_index between 0 and 2),
  body text not null,
  created_at timestamptz not null default now(),
  primary key (conversation_id, member_id, prompt_index)
);

create table messages (
  id bigserial primary key,
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references members (id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on messages (conversation_id, id);

create table venues (
  id serial primary key,
  name text not null,
  area text not null,
  kind text not null,
  notes text,
  active boolean not null default true
);

create table date_plans (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references conversations (id) on delete cascade,
  venue_id int not null references venues (id),
  starts_at timestamptz not null,
  proposed_by uuid not null references members (id),
  confirmed_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table date_checkins (
  date_plan_id uuid not null references date_plans (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  status text not null check (status in ('ok', 'need_help')),
  created_at timestamptz not null default now(),
  primary key (date_plan_id, member_id)
);

create table standing_events (
  id bigserial primary key,
  member_id uuid not null references members (id) on delete cascade,
  kind text not null,
  delta int not null,
  status text not null check (status in ('applied', 'proposed', 'dismissed')),
  reason text not null,
  conversation_id uuid references conversations (id) on delete set null,
  reviewed_by uuid references members (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index standing_events_member_idx on standing_events (member_id, created_at desc);

create table reports (
  id bigserial primary key,
  reporter_id uuid not null references members (id) on delete cascade,
  reported_id uuid not null references members (id) on delete cascade,
  conversation_id uuid references conversations (id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'upheld', 'dismissed')),
  resolved_by uuid references members (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table blocks (
  blocker_id uuid not null references members (id) on delete cascade,
  blocked_id uuid not null references members (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

-- Every SMS the app sends. In mock mode this is the only place messages go.
create table sms_outbox (
  id bigserial primary key,
  to_phone text not null,
  body text not null,
  provider text not null,
  provider_status text,
  created_at timestamptz not null default now()
);

create table settings (
  key text primary key,
  value jsonb not null
);
insert into settings (key, value) values
  ('matching_open', 'false'),
  ('cohort_cap', '400'),
  ('min_per_side_to_open', '40');
