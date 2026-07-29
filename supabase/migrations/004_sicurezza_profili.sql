-- Migrazione di sicurezza URGENTE da eseguire nell'SQL editor del progetto Supabase.
--
-- La policy precedente permetteva a QUALSIASI dipendente autenticato di modificare
-- il proprio campo "ruolo" (es. da 'dipendente' ad 'admin'), perché limitava solo
-- QUALE riga si poteva aggiornare (la propria), non QUALI colonne. Questo consentiva
-- un'auto-promozione ad amministratore da parte di un utente qualsiasi.
--
-- Da ora in poi solo un admin può modificare i profili (coerente con come sono già
-- protetti aggiornamento/eliminazione di cassoni e movimenti).

drop policy if exists "un utente aggiorna solo il proprio profilo" on profiles;

create policy "admin aggiorna i profili"
  on profiles for update
  to authenticated
  using (public.is_admin());

-- Limita dimensione massima e tipi di file accettati nei bucket di upload,
-- per evitare che un account compromesso carichi file arbitrari o enormi.
update storage.buckets
set file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'foto-cassoni';

update storage.buckets
set file_size_limit = 15728640, -- 15 MB
    allowed_mime_types = array['image/png', 'application/pdf']
where id = 'documenti-movimento';
