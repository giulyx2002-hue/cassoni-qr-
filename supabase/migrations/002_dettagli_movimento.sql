-- Migrazione da eseguire nell'SQL editor del progetto Supabase GIA' esistente
-- (quello creato con supabase/schema.sql prima di questa modifica).
-- Aggiunge targa/nome autista/tipo operazione/foto ai movimenti, rimuove quantita,
-- aggiunge i permessi admin per modificare/eliminare, e crea il bucket per le foto.

-- 1. Rimuove la vista che dipende da "quantita" (viene ricreata più sotto)
drop view if exists ultima_posizione;

-- 2. Rimuove quantita e aggiunge i nuovi campi al movimento
alter table movimenti drop column if exists quantita;

alter table movimenti add column if not exists targa text;
alter table movimenti add column if not exists nome_autista text;
alter table movimenti add column if not exists tipo_operazione text;
alter table movimenti add column if not exists foto_urls text[] not null default '{}';

-- Backfill di eventuali righe già esistenti prima di rendere i campi obbligatori
update movimenti
set
  targa = coalesce(targa, 'N/D'),
  nome_autista = coalesce(nome_autista, 'N/D'),
  tipo_operazione = coalesce(tipo_operazione, 'spostamento')
where targa is null or nome_autista is null or tipo_operazione is null;

alter table movimenti alter column targa set not null;
alter table movimenti alter column nome_autista set not null;
alter table movimenti alter column tipo_operazione set not null;

alter table movimenti drop constraint if exists movimenti_tipo_operazione_check;
alter table movimenti add constraint movimenti_tipo_operazione_check
  check (tipo_operazione in ('prelievo', 'consegna', 'spostamento'));

-- 3. Ricrea la vista con l'ultima posizione (colonne aggiornate)
create view ultima_posizione as
select distinct on (cassone_id)
  m.cassone_id,
  m.cliente,
  m.targa,
  m.nome_autista,
  m.tipo_operazione,
  m.dimensioni,
  m.lat,
  m.lng,
  m.created_at as ultimo_movimento,
  c.codice,
  p.nome as ultimo_dipendente
from movimenti m
join cassoni c on c.id = m.cassone_id
join profiles p on p.id = m.dipendente_id
order by m.cassone_id, m.created_at desc;

-- 4. Funzione di appoggio per le policy admin (se non esiste già)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and ruolo = 'admin'
  );
$$;

-- 5. Permessi admin per modificare/eliminare cassoni e movimenti
drop policy if exists "admin aggiorna i cassoni" on cassoni;
create policy "admin aggiorna i cassoni"
  on cassoni for update
  to authenticated
  using (public.is_admin());

drop policy if exists "admin elimina i cassoni" on cassoni;
create policy "admin elimina i cassoni"
  on cassoni for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "admin aggiorna i movimenti" on movimenti;
create policy "admin aggiorna i movimenti"
  on movimenti for update
  to authenticated
  using (public.is_admin());

drop policy if exists "admin elimina i movimenti" on movimenti;
create policy "admin elimina i movimenti"
  on movimenti for delete
  to authenticated
  using (public.is_admin());

-- 6. Bucket storage per le foto dello stato del cassone
insert into storage.buckets (id, name, public)
values ('foto-cassoni', 'foto-cassoni', true)
on conflict (id) do nothing;

drop policy if exists "utenti autenticati caricano foto cassoni" on storage.objects;
create policy "utenti autenticati caricano foto cassoni"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'foto-cassoni');

drop policy if exists "admin elimina foto cassoni" on storage.objects;
create policy "admin elimina foto cassoni"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'foto-cassoni' and public.is_admin());
