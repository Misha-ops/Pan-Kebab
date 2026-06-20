-- PÁN KEBAB — návštevnosť (voliteľné)
-- Spustite v Supabase SQL Editor JEDEN RAZ, navyše k pôvodnému schema.sql
-- (netreba spúšťať schema.sql znova — toto je samostatný doplnok).

create table if not exists visit_stats (
  visit_date date primary key,
  count int not null default 0
);

-- RLS zapnuté, žiadne public policies — k tabuľke sa dostane iba server
-- (Netlify Functions cez SERVICE ROLE key), nikdy priamo prehliadač.
alter table visit_stats enable row level security;

-- Atomický "+1" pre daný deň, bezpečný aj keď dvaja ľudia otvoria stránku
-- v rovnakej sekunde (žiadne race condition pri počítaní).
create or replace function increment_visit_count(target_date date)
returns void
language plpgsql
as $$
begin
  insert into visit_stats (visit_date, count)
  values (target_date, 1)
  on conflict (visit_date)
  do update set count = visit_stats.count + 1;
end;
$$;
