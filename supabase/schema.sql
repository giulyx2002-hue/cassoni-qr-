-- Schema per il tracciamento delle casse scarrabili
-- Da eseguire nell'SQL editor del progetto Supabase (https://app.supabase.com)
-- Per un progetto Supabase gia esistente (creato prima di questa versione),
-- usa invece supabase/migrations/002_dettagli_movimento.sql

-- Profilo utente collegato ad auth.users, con ruolo
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  ruolo text not null default 'dipendente' check (ruolo in ('dipendente', 'admin')),
  created_at timestamptz not null default now()
);

-- Un cassone scarrabile: creato una volta, il suo QR è fisso per tutta la vita
create table cassoni (
  id uuid primary key default gen_random_uuid(),
  codice text not null unique, -- codice breve stampato/incoraggiato nel QR
  dimensioni text,
  note text,
  creato_da uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index cassoni_codice_idx on cassoni (codice);

-- Ogni scansione genera un movimento: posizione + dettagli in quel momento
create table movimenti (
  id uuid primary key default gen_random_uuid(),
  cassone_id uuid not null references cassoni (id) on delete cascade,
  dipendente_id uuid not null references profiles (id),
  cliente text,
  targa text not null,
  nome_autista text not null,
  tipo_operazione text not null check (tipo_operazione in ('prelievo', 'consegna', 'spostamento')),
  dimensioni text,
  note text,
  foto_urls text[] not null default '{}',
  cliente_email text,
  firma_url text,
  pdf_url text,
  lat double precision not null,
  lng double precision not null,
  accuratezza_metri double precision,
  created_at timestamptz not null default now()
);

create index movimenti_cassone_idx on movimenti (cassone_id, created_at desc);

-- Vista con l'ultima posizione nota di ogni cassone (per la dashboard)
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

-- Funzione di appoggio per le policy: l'utente corrente è admin?
create function public.is_admin()
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

-- Row Level Security: tutti gli utenti autenticati (dipendenti+admin) leggono/scrivono
-- cassoni e movimenti. Solo un admin può modificare/eliminare e vedere tutti i profili.
alter table profiles enable row level security;
alter table cassoni enable row level security;
alter table movimenti enable row level security;

create policy "utenti autenticati leggono i profili"
  on profiles for select
  to authenticated
  using (true);

create policy "admin aggiorna i profili"
  on profiles for update
  to authenticated
  using (public.is_admin());

create policy "utenti autenticati leggono i cassoni"
  on cassoni for select
  to authenticated
  using (true);

create policy "utenti autenticati creano cassoni"
  on cassoni for insert
  to authenticated
  with check (true);

create policy "admin aggiorna i cassoni"
  on cassoni for update
  to authenticated
  using (public.is_admin());

create policy "admin elimina i cassoni"
  on cassoni for delete
  to authenticated
  using (public.is_admin());

create policy "utenti autenticati leggono i movimenti"
  on movimenti for select
  to authenticated
  using (true);

create policy "utenti autenticati creano movimenti"
  on movimenti for insert
  to authenticated
  with check (dipendente_id = auth.uid());

create policy "admin aggiorna i movimenti"
  on movimenti for update
  to authenticated
  using (public.is_admin());

create policy "admin elimina i movimenti"
  on movimenti for delete
  to authenticated
  using (public.is_admin());

-- Crea automaticamente un profilo (ruolo dipendente di default) alla registrazione
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Abilita il realtime sulle tabelle usate dalla dashboard
alter publication supabase_realtime add table movimenti;
alter publication supabase_realtime add table cassoni;

-- Bucket storage per le foto dello stato del cassone
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'foto-cassoni', 'foto-cassoni', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy "utenti autenticati caricano foto cassoni"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'foto-cassoni');

create policy "admin elimina foto cassoni"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'foto-cassoni' and public.is_admin());

-- Bucket storage per firme cliente e PDF di consegna generati
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documenti-movimento', 'documenti-movimento', true, 15728640,
  array['image/png', 'application/pdf']
)
on conflict (id) do nothing;

create policy "utenti autenticati caricano documenti movimento"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documenti-movimento');

create policy "admin elimina documenti movimento"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documenti-movimento' and public.is_admin());
