-- Open-ended vetting answers, read by matchmakers only.
alter table members add column vetting_done_at timestamptz;

create table vetting_answers (
  member_id uuid not null references members (id) on delete cascade,
  question_id text not null,
  body text not null check (length(body) <= 1500),
  updated_at timestamptz not null default now(),
  primary key (member_id, question_id)
);
