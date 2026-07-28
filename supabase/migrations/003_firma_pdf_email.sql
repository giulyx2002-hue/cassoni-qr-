-- Migrazione da eseguire nell'SQL editor del progetto Supabase.
-- Aggiunge email cliente, firma e PDF di consegna ai movimenti.

alter table movimenti add column if not exists cliente_email text;
alter table movimenti add column if not exists firma_url text;
alter table movimenti add column if not exists pdf_url text;

-- Bucket storage per firme e PDF di consegna generati
insert into storage.buckets (id, name, public)
values ('documenti-movimento', 'documenti-movimento', true)
on conflict (id) do nothing;

drop policy if exists "utenti autenticati caricano documenti movimento" on storage.objects;
create policy "utenti autenticati caricano documenti movimento"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documenti-movimento');

drop policy if exists "admin elimina documenti movimento" on storage.objects;
create policy "admin elimina documenti movimento"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documenti-movimento' and public.is_admin());
