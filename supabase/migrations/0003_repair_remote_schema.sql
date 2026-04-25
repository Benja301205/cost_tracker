create extension if not exists "pgcrypto";

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'categories' and column_name = 'user_id'
  ) then
    alter table public.categories alter column user_id drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'categories' and column_name = 'color'
  ) then
    alter table public.categories alter column color drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'categories' and column_name = 'kind'
  ) then
    alter table public.categories alter column kind drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'transactions' and column_name = 'user_id'
  ) then
    alter table public.transactions alter column user_id drop not null;
  end if;
end $$;

alter table public.categories add column if not exists icon text not null default '📦';
alter table public.categories add column if not exists sort_order int not null default 0;
alter table public.categories add column if not exists is_active boolean not null default true;
alter table public.categories add column if not exists created_at timestamptz not null default now();
alter table public.categories add column if not exists updated_at timestamptz not null default now();

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('mp', 'cash')),
  created_at timestamptz not null default now()
);

insert into public.wallets (name)
values ('mp'), ('cash')
on conflict (name) do nothing;

alter table public.transactions add column if not exists amount_ars numeric;
update public.transactions set amount_ars = amount where amount_ars is null and amount is not null;
alter table public.transactions alter column amount_ars set not null;
alter table public.transactions add column if not exists wallet_id uuid references public.wallets(id);
alter table public.transactions add column if not exists merchant text;
alter table public.transactions add column if not exists source text not null default 'web';
alter table public.transactions add column if not exists source_inbox_id uuid;
alter table public.transactions add column if not exists source_movement_id uuid;
alter table public.transactions add column if not exists split_claim_id uuid;
alter table public.transactions add column if not exists split_total_ars numeric;
alter table public.transactions add column if not exists updated_at timestamptz not null default now();

create table if not exists public.mp_inbox (
  id uuid primary key default gen_random_uuid(),
  raw_html text,
  received_at timestamptz not null default now(),
  detected_type text not null default 'unknown',
  parsed_amount_ars numeric,
  parsed_merchant text,
  parsed_at timestamptz,
  status text not null default 'pending',
  matched_rule_id uuid,
  resulting_transaction_id uuid,
  telegram_message_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mp_movements (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'mp_report',
  source_id text not null unique,
  movement_type text not null default 'unknown',
  direction text not null,
  amount_ars numeric not null,
  occurred_at timestamptz not null,
  description text,
  raw_payload jsonb not null default '{}'::jsonb,
  match_status text not null default 'unmatched',
  review_status text not null default 'not_needed',
  suggested_split_id uuid,
  telegram_message_id bigint,
  reviewed_at timestamptz,
  matched_split_repayment_id uuid,
  matched_transaction_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.split_claims (
  id uuid primary key default gen_random_uuid(),
  source_transaction_id uuid references public.transactions(id),
  label text not null,
  total_amount_ars numeric not null,
  people_count int not null,
  your_share_ars numeric not null,
  expected_payers_count int not null,
  amount_per_payer_ars numeric not null,
  status text not null default 'pending',
  remind_at timestamptz,
  reminder_stage int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.split_repayments (
  id uuid primary key default gen_random_uuid(),
  split_claim_id uuid not null references public.split_claims(id) on delete cascade,
  payer_count int not null,
  amount_ars numeric not null,
  payment_method text not null,
  source text not null,
  mp_movement_id uuid references public.mp_movements(id),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.auto_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  applies_to text not null,
  match_merchant_regex text,
  match_amount_min numeric,
  match_amount_max numeric,
  match_sender_name_regex text,
  match_sender_cuil text,
  action text not null,
  default_category_id uuid references public.categories(id),
  income_type text,
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace view public.wallet_balances as
select
  w.id as wallet_id,
  w.name,
  coalesce(sum(
    case
      when t.kind = 'income' then t.amount_ars
      when t.kind = 'expense' then -t.amount_ars
      else 0
    end
  ), 0) as balance_ars
from public.wallets w
left join public.transactions t on t.wallet_id = w.id
group by w.id, w.name;

create or replace view public.split_claim_status as
select
  s.*,
  coalesce(sum(r.payer_count), 0)::int as paid_payers,
  greatest(s.expected_payers_count - coalesce(sum(r.payer_count), 0)::int, 0) as remaining_payers,
  greatest(s.expected_payers_count - coalesce(sum(r.payer_count), 0)::int, 0) * s.amount_per_payer_ars as pending_amount_ars,
  case
    when s.status = 'cancelled' then 'cancelled'
    when greatest(s.expected_payers_count - coalesce(sum(r.payer_count), 0)::int, 0) = 0 then 'paid'
    when coalesce(sum(r.payer_count), 0)::int > 0 then 'partially_paid'
    else 'pending'
  end as calculated_status
from public.split_claims s
left join public.split_repayments r on r.split_claim_id = s.id
group by s.id;

create index if not exists transactions_occurred_at_idx on public.transactions(occurred_at desc);
create index if not exists transactions_category_idx on public.transactions(category_id);
create index if not exists transactions_wallet_idx on public.transactions(wallet_id);
create index if not exists mp_inbox_status_idx on public.mp_inbox(status);
create index if not exists mp_movements_match_status_idx on public.mp_movements(match_status);
create index if not exists mp_movements_review_status_idx on public.mp_movements(review_status, occurred_at);
create index if not exists split_claims_status_idx on public.split_claims(status);

insert into public.categories (name, icon, sort_order, is_active)
values
  ('Súper', '🛒', 10, true),
  ('Comida pedida', '🍕', 20, true),
  ('Transporte público', '🚌', 30, true),
  ('Apps de viaje', '🚗', 40, true),
  ('Nafta/estac./peajes', '⛽', 50, true),
  ('Bares y salidas', '🍻', 60, true),
  ('Regalos', '🎁', 70, true),
  ('Salud', '💊', 80, true),
  ('Suscripciones', '📺', 90, true),
  ('Peluquería/cuidado personal', '💇', 100, true),
  ('Retiro de efectivo', '💵', 110, true),
  ('Varios', '📦', 120, true)
on conflict do nothing;

insert into public.auto_rules (name, applies_to, match_merchant_regex, action, default_category_id, enabled, sort_order)
select rule_name, 'expense', regex, 'auto_confirm', c.id, true, rules.sort_order
from (
  values
    ('SUBE', '(^SUBE$|RECARGA SUBE)', 'Transporte público', 10),
    ('Spotify', 'SPOTIFY', 'Suscripciones', 20),
    ('Netflix', 'NETFLIX', 'Suscripciones', 30),
    ('Disney', 'DISNEY', 'Suscripciones', 40),
    ('HBO Max', '(HBO|MAX)', 'Suscripciones', 50),
    ('Apps de viaje', '(UBER|DIDI|CABIFY)', 'Apps de viaje', 60)
) as rules(rule_name, regex, category_name, sort_order)
join public.categories c on c.name = rules.category_name
where not exists (select 1 from public.auto_rules existing where existing.name = rules.rule_name);

insert into public.auto_rules (
  name, applies_to, match_sender_name_regex, match_sender_cuil, action, income_type, enabled, sort_order
)
select 'Mensualidad Guadalupe', 'income', 'GUADALUPE EMILIANA CELI', '23390910304', 'auto_confirm', 'mensualidad', true, 10
where not exists (select 1 from public.auto_rules where name = 'Mensualidad Guadalupe');
