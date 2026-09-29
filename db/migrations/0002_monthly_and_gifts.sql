-- Monthly membership (replaces the 90-day season) and gifting within a match.

alter table seasons add column renewal_reminded_at timestamptz;

alter table payments drop constraint payments_kind_check;
alter table payments add constraint payments_kind_check
  check (kind in ('application_fee', 'season_pass', 'gift'));

create table gift_items (
  id serial primary key,
  name text not null,
  description text not null,
  category text not null check (category in ('flowers', 'chocolates', 'together', 'card')),
  price_kes int not null check (price_kes > 0),
  active boolean not null default true
);

-- A gift can only be sent inside a live conversation. The recipient accepts it and
-- gives a delivery location that only Amora and the florist see; the sender never does.
create table gifts (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references members (id) on delete cascade,
  recipient_id uuid not null references members (id) on delete cascade,
  item_id int not null references gift_items (id),
  price_kes int not null,
  note text check (length(note) <= 200),
  payment_id uuid references payments (id) on delete set null,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'offered', 'accepted', 'declined', 'dispatched', 'delivered', 'cancelled')),
  delivery_area text,
  delivery_details text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  delivered_at timestamptz
);
create index gifts_recipient_idx on gifts (recipient_id, created_at desc);
create index gifts_sender_idx on gifts (sender_id, created_at desc);

insert into gift_items (name, description, category, price_kes) values
  ('A single red rose', 'One long-stem rose with a handwritten card.', 'flowers', 800),
  ('Seasonal bouquet', 'Fresh Kenyan-grown flowers, arranged by our partner florist.', 'flowers', 2800),
  ('A dozen red roses', 'Twelve long-stem roses, wrapped.', 'flowers', 3500),
  ('Box of chocolates', 'Assorted chocolates made in Kenya.', 'chocolates', 1500),
  ('Roses and chocolates', 'Six roses with a small box of chocolates.', 'together', 4200),
  ('Handwritten card', 'Your note, written by hand and delivered.', 'card', 400);
