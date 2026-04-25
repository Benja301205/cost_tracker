insert into public.wallets (name) values ('mp'), ('cash')
on conflict (name) do nothing;

insert into public.categories (name, icon, sort_order, is_active) values
  ('Super', 'ShoppingBasket', 1, true),
  ('Comida pedida', 'Pizza', 2, true),
  ('Transporte publico', 'Bus', 3, true),
  ('Apps de viaje', 'Car', 4, true),
  ('Nafta/estac./peajes', 'Fuel', 5, true),
  ('Bares y salidas', 'Beer', 6, true),
  ('Regalos', 'Gift', 7, true),
  ('Salud', 'HeartPulse', 8, true),
  ('Suscripciones', 'MonitorPlay', 9, true),
  ('Peluqueria/cuidado personal', 'Scissors', 10, true),
  ('Retiro de efectivo', 'BanknoteArrowDown', 11, true),
  ('Varios', 'Package', 12, true);

insert into public.auto_rules (name, applies_to, match_merchant_regex, action, default_category_id, enabled, sort_order)
select 'SUBE', 'expense', '^SUBE$|RECARGA SUBE', 'auto_confirm', c.id, true, 10
from public.categories c where c.name = 'Transporte publico';

insert into public.auto_rules (name, applies_to, match_merchant_regex, action, default_category_id, enabled, sort_order)
select 'Spotify', 'expense', 'SPOTIFY', 'auto_confirm', c.id, true, 20
from public.categories c where c.name = 'Suscripciones';

insert into public.auto_rules (name, applies_to, match_merchant_regex, action, default_category_id, enabled, sort_order)
select 'Netflix', 'expense', 'NETFLIX', 'auto_confirm', c.id, true, 30
from public.categories c where c.name = 'Suscripciones';

insert into public.auto_rules (name, applies_to, match_merchant_regex, action, default_category_id, enabled, sort_order)
select 'Disney', 'expense', 'DISNEY', 'auto_confirm', c.id, true, 40
from public.categories c where c.name = 'Suscripciones';

insert into public.auto_rules (name, applies_to, match_merchant_regex, action, default_category_id, enabled, sort_order)
select 'HBO Max', 'expense', 'HBO|MAX', 'auto_confirm', c.id, true, 50
from public.categories c where c.name = 'Suscripciones';

insert into public.auto_rules (name, applies_to, match_merchant_regex, action, default_category_id, enabled, sort_order)
select 'Apps de viaje', 'expense', 'UBER|DIDI|CABIFY', 'auto_confirm', c.id, true, 60
from public.categories c where c.name = 'Apps de viaje';

insert into public.auto_rules (
  name,
  applies_to,
  match_sender_name_regex,
  match_sender_cuil,
  action,
  income_type,
  enabled,
  sort_order
) values (
  'Mensualidad Guadalupe',
  'income',
  'GUADALUPE EMILIANA CELI',
  '23390910304',
  'auto_confirm',
  'mensualidad',
  true,
  10
);
