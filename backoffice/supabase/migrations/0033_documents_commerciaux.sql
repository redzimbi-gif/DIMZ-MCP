-- ---------------------------------------------------------------------------
-- Devis puis facture légale générés par l'app (numérotation séquentielle
-- sans trou, obligatoire en droit français) — vient s'ajouter à `factures`
-- (journal manuel des factures déjà émises ailleurs, inchangé) sans le
-- remplacer. Format numéro : DEV-AAMM-0000 / FAC-AAMM-0000, compteur par
-- type et par mois, sur le même principe que next_dossier_reference().
-- ---------------------------------------------------------------------------

create type document_commercial_type as enum ('devis', 'facture');
create type document_commercial_statut as enum ('brouillon', 'envoye', 'accepte', 'refuse', 'paye', 'annule');

create table document_commercial_counters (
  type document_commercial_type not null,
  periode text not null,
  compteur int not null default 0,
  primary key (type, periode)
);

create or replace function next_document_commercial_numero(p_type document_commercial_type)
returns text
language plpgsql
as $$
declare
  v_periode text := to_char(now(), 'YYMM');
  v_compteur int;
  v_prefix text := case p_type when 'devis' then 'DEV' else 'FAC' end;
begin
  insert into document_commercial_counters (type, periode, compteur)
  values (p_type, v_periode, 1)
  on conflict (type, periode) do update set compteur = document_commercial_counters.compteur + 1
  returning compteur into v_compteur;

  return v_prefix || '-' || v_periode || '-' || lpad(v_compteur::text, 4, '0');
end;
$$;

create table documents_commerciaux (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  type document_commercial_type not null,
  dossier_id uuid references dossiers(id),
  client_id uuid references clients(id),
  convoyage_id uuid references convoyages(id),
  objet text,
  lignes jsonb not null default '[]',
  montant_ht numeric not null default 0,
  montant_tva numeric not null default 0,
  montant_ttc numeric not null default 0,
  statut document_commercial_statut not null default 'brouillon',
  devis_origine_id uuid references documents_commerciaux(id),
  date_emission date not null default current_date,
  date_echeance date,
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_document_commercial_numero()
returns trigger
language plpgsql
as $$
begin
  new.numero := next_document_commercial_numero(new.type);
  return new;
end;
$$;

create trigger documents_commerciaux_set_numero before insert on documents_commerciaux
  for each row execute function set_document_commercial_numero();

create trigger documents_commerciaux_set_updated_at before update on documents_commerciaux
  for each row execute function set_updated_at();

create index documents_commerciaux_dossier_idx on documents_commerciaux (dossier_id);
create index documents_commerciaux_client_idx on documents_commerciaux (client_id);

alter table document_commercial_counters enable row level security;
alter table documents_commerciaux enable row level security;
