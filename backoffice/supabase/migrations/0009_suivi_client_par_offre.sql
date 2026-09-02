-- ---------------------------------------------------------------------------
-- Suivi client par étapes dépendant de l'offre (accompagnement) et flux
-- dédié convoyage (accepté/refusé). Le statut interne (dossiers.statut,
-- pipeline à 10 valeurs, kanban interne) est conservé tel quel : ces
-- nouvelles colonnes pilotent uniquement ce que le client voit sur
-- /suivi/[token]. Les séquences d'étapes par offre vivent côté application
-- (src/lib/etapes.ts), pas en base : elles sont amenées à évoluer souvent,
-- une colonne text libre évite une migration à chaque ajustement.
-- ---------------------------------------------------------------------------

alter table dossiers add column etape_client text not null default 'demande_recue';
alter table dossiers add column convoyage_decision text not null default 'en_attente'
  check (convoyage_decision in ('en_attente', 'accepte', 'refuse'));

-- Toute nouvelle demande d'accompagnement démarre sur l'offre Découverte
-- tant que le copilote n'a pas choisi une autre offre pour ce dossier.
alter table dossiers alter column offre set default 'decouverte';

create table dossier_etape_history (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers(id) on delete cascade,
  etape_client text not null,
  note text,
  changed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index dossier_etape_history_dossier_idx on dossier_etape_history (dossier_id, created_at);

alter table dossier_etape_history enable row level security;
