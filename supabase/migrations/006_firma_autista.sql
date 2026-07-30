-- Migrazione da eseguire nell'SQL editor del progetto Supabase.
-- Aggiunge la firma dell'autista (oltre a quella già presente del cliente)
-- ai movimenti di tipo Consegna.

alter table movimenti add column if not exists firma_autista_url text;
