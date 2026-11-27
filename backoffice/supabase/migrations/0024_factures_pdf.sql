-- ---------------------------------------------------------------------------
-- Pièce jointe PDF de la facture (le document lui-même, émis en dehors du
-- back-office).
-- ---------------------------------------------------------------------------

alter table factures add column if not exists pdf_path text;
