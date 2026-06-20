-- PÁN KEBAB — Supabase setup
-- Run this whole file once in: Supabase Dashboard -> SQL Editor -> New query -> Run

-- 1) Table -------------------------------------------------------------
create table if not exists menu_items (
  id text primary key,
  category text not null default 'Kebab',
  name text not null,
  description text not null default '',
  price numeric(6,2) not null check (price >= 0),
  meat_options text,              -- e.g. 'Kuriacie / Teľacie', or NULL (e.g. for dezerty)
  image_url text not null default '',
  is_placeholder boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

-- 2) Lock it down --------------------------------------------------------
-- RLS on: nobody can write directly. The Netlify Functions use the
-- SERVICE ROLE key, which always bypasses RLS, so the admin panel keeps
-- working — but a visitor's browser (using only public keys, which this
-- project never even exposes) could never edit the menu directly.
alter table menu_items enable row level security;

drop policy if exists "Public can read menu" on menu_items;
create policy "Public can read menu"
  on menu_items for select
  to anon, authenticated
  using (true);

-- 3) Storage bucket for dish photos --------------------------------------
-- "public" so uploaded photos are servable via a plain public URL.
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

-- 4) Seed data — matches js/menu-data.js -------------------------------
insert into menu_items (id, category, name, description, price, meat_options, image_url, is_placeholder, sort_order)
values
  ('durum',   'Kebab',  'Düriim Kebab', 'Bohato naplnený mäsom. Šťavnatý a plný chuti. Čerstvo pripravený.', 5.50, 'Kuriacie / Teľacie', 'assets/img/durum.svg',   true, 1),
  ('doner',   'Kebab',  'Döner Kebab',  'Viac mäsa, viac chuti. Čerstvo pečená žemľa. Vyrobený s láskou.',  6.50, 'Kuriacie / Teľacie', 'assets/img/doner.svg',   true, 2),
  ('box',     'Kebab',  'Kebab Box',    'Chrumkavé hranolky. Väčšia porcia. Viac sýtosti.',                  8.00, 'Kuriacie / Teľacie', 'assets/img/box.svg',     true, 3),
  ('tanier',  'Kebab',  'Tanier Kebab', 'Obrovská porcia. Maximum sýtosti. Maximum chuti.',                  8.00, 'Kuriacie / Teľacie', 'assets/img/tanier.svg',  true, 4),
  ('baklava', 'Dezert', 'Baklava',      'Pravá turecká baklava. Dokonalá bodka po kebabe. Sladká odmena po dobrom jedle.', 1.50, null, 'assets/img/baklava.svg', true, 5)
on conflict (id) do nothing;
