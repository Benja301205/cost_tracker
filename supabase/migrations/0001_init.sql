create extension if not exists "pgcrypto";

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('mp', 'cash')),
  created_at timestamptz not null default now()
);

create table public.mp_inbox (
  id uuid primary key default gen_random_uuid(),
  raw_html text,
  received_at timestamptz not null default now(),
  detected_type text not null default 'unknown' check (detected_type in ('expense', 'transfer_sent', 'unknown')),
  parsed_amount_ars numeric,
  parsed_merchant text,
  parsed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'discarded', 'auto_confirmed', 'parse_failed')),
  matched_rule_id uuid,
  resulting_transaction_id uuid,
  telegram_message_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mp_movements (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'mp_report' check (source in ('mp_report', 'email', 'manual')),
  source_id text not null unique,
  movement_type text not null default 'unknown' check (movement_type in ('payment', 'transfer_sent', 'transfer_received', 'refund', 'withdrawal', 'unknown')),
  direction text not null check (direction in ('in', 'out')),
  amount_ars numeric not null check (amount_ars >= 0),
  occurred_at timestamptz not null,
  description text,
  raw_payload jsonb not null default '{}'::jsonb,
  match_status text not null default 'unmatched' check (match_status in ('unmatched', 'matched_split', 'matched_income', 'ignored')),
  review_status text not null default 'not_needed' check (review_status in ('not_needed', 'needs_review', 'asked', 'resolved')),
  suggested_split_id uuid,
  telegram_message_id bigint,
  reviewed_at timestamptz,
  matched_split_repayment_id uuid,
  matched_transaction_id uuid,
  created_at timestamptz not null default now()
);

create table public.split_claims (
  id uuid primary key default gen_random_uuid(),
  source_transaction_id uuid,
  label text not null,
  total_amount_ars numeric not null check (total_amount_ars >= 0),
  people_count int not null check (people_count >= 2),
  your_share_ars numeric not null check (your_share_ars >= 0),
  expected_payers_count int not null check (expected_payers_count >= 1),
  amount_per_payer_ars numeric not null check (amount_per_payer_ars >= 0),
  status text not null default 'pending' check (status in ('pending', 'partially_paid', 'paid', 'cancelled')),
  remind_at timestamptz,
  reminder_stage int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  amount_ars numeric not null check (amount_ars >= 0),
  occurred_at timestamptz not null,
  category_id uuid references public.categories(id),
  wallet_id uuid references public.wallets(id),
  kind text not null check (kind in ('expense', 'income', 'transfer')),
  merchant text,
  description text,
  source text not null check (source in ('email', 'mp_report', 'telegram', 'web')),
  source_inbox_id uuid references public.mp_inbox(id),
  source_movement_id uuid references public.mp_movements(id),
  split_claim_id uuid references public.split_claims(id),
  split_total_ars numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mp_inbox
  add constraint mp_inbox_resulting_transaction_fk foreign key (resulting_transaction_id) references public.transactions(id) not valid;

alter table public.split_claims
  add constraint split_claims_source_transaction_fk foreign key (source_transaction_id) references public.transactions(id) not valid;

create table public.split_repayments (
  id uuid primary key default gen_random_uuid(),
  split_claim_id uuid not null references public.split_claims(id) on delete cascade,
  payer_count int not null check (payer_count >= 1),
  amount_ars numeric not null check (amount_ars >= 0),
  payment_method text not null check (payment_method in ('mp', 'cash', 'other', 'manual')),
  source text not null check (source in ('telegram', 'mp_report', 'app')),
  mp_movement_id uuid references public.mp_movements(id),
  note text,
  created_at timestamptz not null default now()
);

create table public.auto_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  applies_to text not null check (applies_to in ('expense', 'income')),
  match_merchant_regex text,
  match_amount_min numeric,
  match_amount_max numeric,
  match_sender_name_regex text,
  match_sender_cuil text,
  action text not null check (action in ('auto_confirm', 'auto_discard', 'pending')),
  default_category_id uuid references public.categories(id),
  income_type text check (income_type in ('mensualidad', 'split_refund', 'other')),
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mp_inbox
  add constraint mp_inbox_matched_rule_fk foreign key (matched_rule_id) references public.auto_rules(id) not valid;

alter table public.mp_inbox validate constraint mp_inbox_matched_rule_fk;
alter table public.mp_inbox validate constraint mp_inbox_resulting_transaction_fk;
alter table public.split_claims validate constraint split_claims_source_transaction_fk;

alter table public.mp_movements
  add constraint mp_movements_suggested_split_fk foreign key (suggested_split_id) references public.split_claims(id),
  add constraint mp_movements_repayment_fk foreign key (matched_split_repayment_id) references public.split_repayments(id),
  add constraint mp_movements_transaction_fk foreign key (matched_transaction_id) references public.transactions(id);

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

create index transactions_occurred_at_idx on public.transactions(occurred_at desc);
create index transactions_category_idx on public.transactions(category_id);
create index mp_inbox_status_idx on public.mp_inbox(status);
create index mp_movements_match_status_idx on public.mp_movements(match_status);
create index mp_movements_review_status_idx on public.mp_movements(review_status, occurred_at);
create index split_claims_status_idx on public.split_claims(status);

alter table public.categories enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.mp_inbox enable row level security;
alter table public.mp_movements enable row level security;
alter table public.split_claims enable row level security;
alter table public.split_repayments enable row level security;
alter table public.auto_rules enable row level security;

create policy "single user read categories" on public.categories for select to authenticated using (true);
create policy "single user write categories" on public.categories for all to authenticated using (true) with check (true);
create policy "single user wallets" on public.wallets for all to authenticated using (true) with check (true);
create policy "single user transactions" on public.transactions for all to authenticated using (true) with check (true);
create policy "single user inbox" on public.mp_inbox for all to authenticated using (true) with check (true);
create policy "single user movements" on public.mp_movements for all to authenticated using (true) with check (true);
create policy "single user splits" on public.split_claims for all to authenticated using (true) with check (true);
create policy "single user repayments" on public.split_repayments for all to authenticated using (true) with check (true);
create policy "single user rules" on public.auto_rules for all to authenticated using (true) with check (true);
