-- DIMZ Back-office — schéma initial
-- À exécuter dans Supabase : Database > SQL Editor > coller ce fichier > Run.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Statuts de dossier (ordre = ordre du pipeline / de la checklist client)
-- ---------------------------------------------------------------------------
create type dossier_statut as enum (
  'demande_recue',
  'analyse_besoin',
  'recherche',
  'vehicules_selectionnes',
  'inspection',
  'negociation',
  'achat_valide',
  'convoyage',
  'livraison',
  'dossier_termine'
);

create type dossier_offre as enum ('decouverte', 'copilote', 'copilote_plus', 'convoyage_seul', 'expertise_seule');

create type agenda_event_type as enum ('rendez_vous', 'visioconference', 'inspection', 'convoyage', 'livraison');

create type document_type as enum (
  'carte_grise', 'certificat_cession', 'facture', 'contrat',
  'rapport_inspection', 'photo', 'administratif', 'autre'
);

-- ---------------------------------------------------------------------------
-- Profils staff (lié à auth.users) — rôles pour préparer la V2
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'admin', -- admin | commercial | inspecteur | convoyeur (évolutif)
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  civilite text,
  nom text not null,
  prenom text,
  telephone text,
  email text,
  adresse text,
  notes_privees text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_nom_idx on clients (nom, prenom);
create index clients_email_idx on clients (email);

-- ---------------------------------------------------------------------------
-- Dossiers (un dossier = un projet d'accompagnement / convoyage pour un client)
-- ---------------------------------------------------------------------------
create table dossiers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  reference text not null default ('DMZ-' || to_char(now(), 'YYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 4)),
  offre dossier_offre,
  budget text,
  vehicule_recherche text,
  marques_souhaitees text,
  motorisation text,
  boite_vitesses text,
  km_max text,
  region text,
  commentaires text,
  statut dossier_statut not null default 'demande_recue',
  valeur_estimee numeric(10,2),
  source text not null default 'site', -- site | manuel | telephone...
  portal_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dossiers_client_idx on dossiers (client_id);
create index dossiers_statut_idx on dossiers (statut);
create unique index dossiers_portal_token_idx on dossiers (portal_token);

create table dossier_statut_history (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers(id) on delete cascade,
  statut dossier_statut not null,
  note text,
  changed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index dossier_statut_history_dossier_idx on dossier_statut_history (dossier_id, created_at);

-- ---------------------------------------------------------------------------
-- Recherche de véhicules : annonces rattachées à un dossier
-- ---------------------------------------------------------------------------
create table annonces (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers(id) on delete cascade,
  titre text not null,
  lien text,
  prix numeric(10,2),
  prix_negocie numeric(10,2),
  kilometrage numeric(10,0),
  annee int,
  localisation text,
  avis_copilote text,
  points_forts text,
  points_faibles text,
  score_confiance int check (score_confiance between 0 and 100),
  selectionnee boolean not null default false,
  photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index annonces_dossier_idx on annonces (dossier_id);

-- ---------------------------------------------------------------------------
-- Inspections
-- ---------------------------------------------------------------------------
create table inspections (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers(id) on delete cascade,
  annonce_id uuid references annonces(id) on delete set null,
  date_inspection date not null default current_date,
  etat_exterieur text,
  etat_interieur text,
  pneus text,
  freins text,
  carrosserie text,
  mecanique text,
  essai_routier text,
  defauts_constates text,
  commentaires text,
  note_finale numeric(3,1) check (note_finale between 0 and 10),
  photos text[] not null default '{}',
  videos text[] not null default '{}',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inspections_dossier_idx on inspections (dossier_id);

-- ---------------------------------------------------------------------------
-- Convoyages
-- ---------------------------------------------------------------------------
create type convoyage_statut as enum ('planifie', 'en_cours', 'livre', 'annule');

create table convoyages (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers(id) on delete cascade,
  adresse_depart text,
  adresse_arrivee text,
  date_convoyage date,
  heure time,
  conducteur text,
  km_depart numeric(10,0),
  km_arrivee numeric(10,0),
  niveau_carburant text,
  photos_avant text[] not null default '{}',
  photos_apres text[] not null default '{}',
  signature_client text,
  rapport_notes text,
  statut convoyage_statut not null default 'planifie',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index convoyages_dossier_idx on convoyages (dossier_id);

-- ---------------------------------------------------------------------------
-- Agenda
-- ---------------------------------------------------------------------------
create table agenda_events (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  type agenda_event_type not null,
  dossier_id uuid references dossiers(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  date_debut timestamptz not null,
  date_fin timestamptz,
  lieu text,
  notes text,
  rappel_envoye boolean not null default false,
  created_at timestamptz not null default now()
);
create index agenda_events_date_idx on agenda_events (date_debut);
create index agenda_events_dossier_idx on agenda_events (dossier_id);

-- ---------------------------------------------------------------------------
-- Documents (métadonnées ; fichiers réels dans Supabase Storage, bucket "documents")
-- ---------------------------------------------------------------------------
create table documents (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid references dossiers(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  type document_type not null default 'autre',
  nom text not null,
  storage_path text not null,
  taille bigint,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index documents_dossier_idx on documents (dossier_id);
create index documents_client_idx on documents (client_id);

-- ---------------------------------------------------------------------------
-- Notes / échanges internes (rattachés à un dossier et/ou un client)
-- ---------------------------------------------------------------------------
create table notes_internes (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid references dossiers(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  auteur uuid references profiles(id),
  contenu text not null,
  created_at timestamptz not null default now()
);
create index notes_internes_dossier_idx on notes_internes (dossier_id);
create index notes_internes_client_idx on notes_internes (client_id);

-- ---------------------------------------------------------------------------
-- Notifications (staff, en app)
-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  message text,
  type text not null default 'info', -- info | nouveau_dossier | statut | rappel
  lien text,
  lue boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_lue_idx on notifications (lue, created_at);

-- ---------------------------------------------------------------------------
-- Journal des actions (audit log)
-- ---------------------------------------------------------------------------
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,          -- ex: dossier.cree, dossier.statut_change, document.ajoute...
  entite_type text not null,     -- dossier | client | annonce | inspection | convoyage | document
  entite_id uuid,
  description text not null,
  acteur uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index activity_log_created_idx on activity_log (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_set_updated_at before update on clients
  for each row execute function set_updated_at();
create trigger dossiers_set_updated_at before update on dossiers
  for each row execute function set_updated_at();
create trigger annonces_set_updated_at before update on annonces
  for each row execute function set_updated_at();
create trigger inspections_set_updated_at before update on inspections
  for each row execute function set_updated_at();
create trigger convoyages_set_updated_at before update on convoyages
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Sécurité : RLS activée partout. Toutes les requêtes de l'application passent
-- par le serveur Next.js avec la clé "service role" (jamais exposée au
-- navigateur), qui contourne RLS par construction. Le navigateur n'utilise
-- Supabase que pour l'authentification (clé anonyme). Aucun accès direct
-- table par table n'est donc ouvert au client — c'est le choix le plus sûr
-- pour une V1.
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table clients enable row level security;
alter table dossiers enable row level security;
alter table dossier_statut_history enable row level security;
alter table annonces enable row level security;
alter table inspections enable row level security;
alter table convoyages enable row level security;
alter table agenda_events enable row level security;
alter table documents enable row level security;
alter table notes_internes enable row level security;
alter table notifications enable row level security;
alter table activity_log enable row level security;

create policy "profiles: self read" on profiles for select using (auth.uid() = id);
