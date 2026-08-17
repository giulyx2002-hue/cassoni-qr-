-- Migrazione da eseguire nell'SQL editor del progetto Supabase.
-- Tabella "clienti": elenco nomi clienti usato per l'autocompletamento del
-- campo Cliente nel form del movimento. Alimentata da uno script locale che
-- sincronizza i nomi (imp_ragsoc) dal database Access aziendale.

create table clienti (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

alter table clienti enable row level security;

create policy "utenti autenticati leggono i clienti"
  on clienti for select
  to authenticated
  using (true);

create policy "utenti autenticati aggiungono clienti"
  on clienti for insert
  to authenticated
  with check (true);

create policy "admin elimina clienti"
  on clienti for delete
  to authenticated
  using (public.is_admin());
