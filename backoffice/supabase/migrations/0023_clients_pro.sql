-- ---------------------------------------------------------------------------
-- Clients professionnels : type de client (particulier / professionnel),
-- avec raison sociale et SIRET pour les pros — repris automatiquement sur
-- les factures liées à ce client dans Facturation.
-- ---------------------------------------------------------------------------

alter table clients add column if not exists type_client text not null default 'particulier';
alter table clients add column if not exists raison_sociale text;
alter table clients add column if not exists siret text;
