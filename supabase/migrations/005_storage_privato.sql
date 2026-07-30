-- Migrazione da eseguire nell'SQL editor del progetto Supabase.
--
-- Rende privati i bucket delle foto/firme/PDF: finora chiunque avesse un link
-- (anche senza account) poteva aprirlo, perché i bucket erano pubblici.
-- Da ora i file sono raggiungibili solo tramite link firmati (con token segreto,
-- non indovinabile) generati dall'app per gli utenti autenticati. Per non dover
-- rigenerare i link ogni volta, la scadenza è impostata a 10 anni: di fatto
-- permanenti finché restano dove sono stati generati (email del cliente,
-- dashboard), ma inutilizzabili se il link viene copiato o rubato al di fuori
-- di questi canali... salvo comunque prima della scadenza.

update storage.buckets set public = false where id in ('foto-cassoni', 'documenti-movimento');

create policy "utenti autenticati leggono foto cassoni"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'foto-cassoni');

create policy "utenti autenticati leggono documenti movimento"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documenti-movimento');

-- Nota: i movimenti creati PRIMA di questa migrazione hanno salvato URL
-- "pubblici" (con /object/public/ nel percorso) che smetteranno di funzionare
-- perché il bucket non è più pubblico. Solo i nuovi movimenti da qui in avanti
-- avranno link firmati funzionanti.
