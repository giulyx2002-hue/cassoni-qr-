-- Migrazione da eseguire nell'SQL editor del progetto Supabase.
-- Elenchi targhe mezzi e nomi autisti, usati per l'autocompletamento nel
-- form del movimento. Stesso pattern della tabella "clienti".

create table mezzi (
  id uuid primary key default gen_random_uuid(),
  targa text not null unique,
  created_at timestamptz not null default now()
);

create table autisti (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

alter table mezzi enable row level security;
alter table autisti enable row level security;

create policy "utenti autenticati leggono i mezzi"
  on mezzi for select
  to authenticated
  using (true);

create policy "utenti autenticati aggiungono mezzi"
  on mezzi for insert
  to authenticated
  with check (true);

create policy "admin elimina mezzi"
  on mezzi for delete
  to authenticated
  using (public.is_admin());

create policy "utenti autenticati leggono gli autisti"
  on autisti for select
  to authenticated
  using (true);

create policy "utenti autenticati aggiungono autisti"
  on autisti for insert
  to authenticated
  with check (true);

create policy "admin elimina autisti"
  on autisti for delete
  to authenticated
  using (public.is_admin());
