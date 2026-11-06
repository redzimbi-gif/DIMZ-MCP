-- ---------------------------------------------------------------------------
-- Prospection B2B : les professionnels de l'automobile (concessions, garages,
-- carrossiers, loueurs) de la métropole de Lyon et du bassin annécien, à qui
-- DIMZ vend son offre de convoyage.
--
-- Table dédiée et non une extension de "clients", pour trois raisons :
--   1. six clés étrangères pointent sur clients, dont dossiers.client_id qui
--      est "not null on delete cascade" — un client est structurellement une
--      personne ayant au moins un dossier ;
--   2. listClients fait systématiquement "select *, dossiers(id)" et l'UI
--      compte les dossiers : y déverser des milliers de prospects sans dossier
--      polluerait la liste clients et tous ses décomptes ;
--   3. un prospect a son propre cycle de vie (statut commercial, relances) et
--      aucune de ces colonnes n'a de sens sur un client déjà signé.
-- Le passage de l'un à l'autre se fait par converti_client_id, renseigné le
-- jour où le prospect signe.
--
-- statut / categorie / source / zone sont des colonnes text avec contrainte
-- "check" plutôt que des types enum PostgreSQL : c'est la doctrine retenue
-- depuis 0009 (« une colonne text libre évite une migration à chaque
-- ajustement »), déjà appliquée à messages.auteur et convoyage_decision.
-- ---------------------------------------------------------------------------

create table prospects (
  id uuid primary key default gen_random_uuid(),

  -- Identité (alimentée par la base SIRENE, ou saisie à la main)
  raison_sociale text not null,
  enseigne text,
  siret text,
  siren text,
  code_naf text,
  categorie text not null default 'autre' check (categorie in (
    'concession', 'garage', 'carrosserie', 'location', 'moto',
    'equipementier', 'controle_technique', 'autre'
  )),
  tranche_effectif text,

  -- Localisation. code_commune est le code INSEE : c'est lui qui détermine la
  -- zone de façon fiable, un code postal pouvant couvrir plusieurs communes.
  adresse text,
  code_postal text,
  ville text,
  code_commune text,
  zone text check (zone in ('lyon', 'annecy', 'autre')),

  -- Contact. Jamais écrasé par un ré-import : voir upsert_prospect_sirene.
  telephone text,
  email text,
  site_web text,
  responsable_nom text,
  responsable_fonction text,

  -- Suivi commercial
  statut text not null default 'froid' check (statut in (
    'froid', 'a_contacter', 'contact_en_cours', 'rdv_pris',
    'pas_interesse', 'a_recontacter', 'converti'
  )),
  source text not null default 'manuel' check (source in (
    'sirene', 'google_places', 'apollo', 'manuel', 'csv'
  )),
  notes text,
  derniere_relance_le date,
  prochaine_relance_le date,
  converti_client_id uuid references clients(id) on delete set null,

  -- Traçabilité des enrichissements tiers. place_id est le seul champ Google
  -- Maps stockable durablement d'après leurs conditions d'utilisation ; les
  -- autres champs issus de Places doivent être rafraîchis, d'où la date.
  place_id text,
  place_rafraichi_le timestamptz,
  apollo_organization_id text,
  apollo_enrichi_le timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prospects_statut_idx on prospects (statut);
create index prospects_ville_idx on prospects (ville);
create index prospects_categorie_idx on prospects (categorie);
create index prospects_zone_statut_idx on prospects (zone, statut);
create index prospects_created_idx on prospects (created_at desc);
create index prospects_relance_idx on prospects (prochaine_relance_le)
  where prochaine_relance_le is not null;

-- Clé de dédoublonnage des imports : un établissement = un SIRET. Index
-- partiel, car un prospect saisi à la main n'a pas forcément de SIRET et
-- plusieurs lignes sans SIRET doivent rester possibles.
create unique index prospects_siret_key on prospects (siret)
  where siret is not null;

create trigger prospects_set_updated_at before update on prospects
  for each row execute function set_updated_at();

-- Comme les autres tables de ce schéma : RLS activé sans policy. Toutes les
-- lectures/écritures passent par le serveur avec la clé service-role.
alter table prospects enable row level security;

-- ---------------------------------------------------------------------------
-- Historique de contact : on réutilise notes_internes plutôt que de créer une
-- table dédiée. Elle porte déjà auteur / contenu / created_at, ses deux
-- colonnes de rattachement existantes sont nullables, et le back-office a
-- déjà le composant (AutoResetForm) et l'action d'ajout à recopier.
-- ---------------------------------------------------------------------------

alter table notes_internes
  add column prospect_id uuid references prospects(id) on delete cascade;

create index notes_internes_prospect_idx on notes_internes (prospect_id);

-- ---------------------------------------------------------------------------
-- Import SIRENE : insertion ou mise à jour par SIRET, en une seule instruction.
--
-- Cette fonction existe pour deux raisons. D'abord PostgREST ne sait pas viser
-- un index partiel, donc un upsert appelé depuis le client échouerait contre
-- prospects_siret_key ; en SQL, la clause "where" du conflict_target permet de
-- désigner l'index sans ambiguïté.
--
-- Ensuite et surtout : un ré-import ne doit jamais écraser le travail de
-- l'équipe. Les champs administratifs (raison sociale, adresse, code NAF...)
-- sont rafraîchis depuis la source officielle, mais les coordonnées saisies à
-- la main sont conservées par coalesce, et le suivi commercial (statut, notes,
-- relances, conversion) n'est pas touché du tout. Relancer le recensement est
-- donc toujours sans risque.
-- ---------------------------------------------------------------------------

create or replace function upsert_prospect_sirene(p jsonb) returns uuid as $$
  insert into prospects (
    raison_sociale, enseigne, siret, siren, code_naf, categorie,
    tranche_effectif, adresse, code_postal, ville, code_commune, zone,
    telephone, site_web, responsable_nom, source
  )
  values (
    p->>'raison_sociale',
    p->>'enseigne',
    p->>'siret',
    p->>'siren',
    p->>'code_naf',
    coalesce(p->>'categorie', 'autre'),
    p->>'tranche_effectif',
    p->>'adresse',
    p->>'code_postal',
    p->>'ville',
    p->>'code_commune',
    p->>'zone',
    p->>'telephone',
    p->>'site_web',
    p->>'responsable_nom',
    'sirene'
  )
  on conflict (siret) where siret is not null
  do update set
    raison_sociale   = excluded.raison_sociale,
    enseigne         = excluded.enseigne,
    siren            = excluded.siren,
    code_naf         = excluded.code_naf,
    categorie        = excluded.categorie,
    tranche_effectif = excluded.tranche_effectif,
    adresse          = excluded.adresse,
    code_postal      = excluded.code_postal,
    ville            = excluded.ville,
    code_commune     = excluded.code_commune,
    zone             = excluded.zone,
    -- Coordonnées : on ne comble que ce qui est encore vide.
    telephone        = coalesce(prospects.telephone, excluded.telephone),
    site_web         = coalesce(prospects.site_web, excluded.site_web),
    responsable_nom  = coalesce(prospects.responsable_nom, excluded.responsable_nom)
    -- statut, notes, relances, email, responsable_fonction, converti_client_id
    -- et source : volontairement absents, ils appartiennent à l'équipe.
  returning id;
$$ language sql set search_path = public;

-- Décompte par statut, pour les cartes en tête de la liste. PostgREST ne sait
-- pas faire de "group by" : sans cette fonction il faudrait sept requêtes de
-- comptage à chaque affichage de la page.
create or replace function stats_prospects()
returns table (statut text, total bigint) as $$
  select statut, count(*)::bigint from prospects group by statut;
$$ language sql set search_path = public;
