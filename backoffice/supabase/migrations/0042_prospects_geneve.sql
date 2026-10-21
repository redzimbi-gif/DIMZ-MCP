-- ---------------------------------------------------------------------------
-- Prospection sur le canton de Genève, en remplacement de la Métropole de Lyon.
--
-- Genève n'est pas une zone française de plus : c'est un autre pays, donc un
-- autre registre officiel. Les établissements genevois viennent du Répertoire
-- des entreprises du canton (REG), publié en open data par le SITG, et non de
-- SIRENE. Deux conséquences sur le schéma :
--
--   1. l'identité légale ne se dit pas en SIRET/SIREN mais en IDE (le numéro
--      d'identification des entreprises suisse, « CHE-123.456.789 ») ;
--   2. le REG ne publie pas d'équivalent du SIRET — un numéro unique par
--      établissement — d'où ref_reg, construite par le script de recensement
--      à partir de ce que le registre expose de plus stable (identifiant
--      d'établissement s'il existe, sinon IDE + identifiant d'adresse).
--
-- On ajoute deux colonnes plutôt que de détourner siret/siren : une colonne
-- nommée « siret » qui contiendrait un identifiant suisse se paierait à chaque
-- lecture du schéma, et le back-office affiche ces champs sous leurs noms
-- officiels.
--
-- Cette migration est purement additive : elle n'enlève ni la zone « lyon » ni
-- les fiches lyonnaises, qui partent dans 0043 — la contrainte « check » ne
-- peut interdire 'lyon' que lorsque plus aucune ligne ne le porte.
-- ---------------------------------------------------------------------------

-- Identité légale suisse. Pas d'unicité : une même entreprise a autant
-- d'établissements que d'adresses, et c'est ref_reg qui les distingue.
alter table prospects add column ide text;

-- Clé de dédoublonnage des imports genevois, l'équivalent de prospects_siret_key
-- pour le REG. Index partiel, pour la même raison que côté SIRET : un prospect
-- saisi à la main n'a pas de référence de registre, et plusieurs lignes sans
-- référence doivent rester possibles.
alter table prospects add column ref_reg text;

create unique index prospects_ref_reg_key on prospects (ref_reg)
  where ref_reg is not null;

-- La zone accueille Genève. 'lyon' reste toléré le temps que 0043 vide les
-- fiches lyonnaises : une contrainte "check" est validée contre les lignes
-- existantes, donc l'interdire maintenant ferait échouer la migration.
alter table prospects drop constraint prospects_zone_check;
alter table prospects add constraint prospects_zone_check
  check (zone in ('lyon', 'geneve', 'annecy', 'autre'));

-- Nouvelle source : le registre genevois.
alter table prospects drop constraint prospects_source_check;
alter table prospects add constraint prospects_source_check
  check (source in ('sirene', 'reg', 'google_places', 'apollo', 'manuel', 'csv'));

-- ---------------------------------------------------------------------------
-- Import REG : insertion ou mise à jour par référence d'établissement.
--
-- Jumelle de upsert_prospect_sirene (0041) et soumise aux mêmes règles : les
-- champs administratifs sont rafraîchis depuis la source officielle, les
-- coordonnées saisies à la main ne sont que complétées, et le suivi commercial
-- (statut, notes, relances, conversion) n'est pas touché du tout. Relancer le
-- recensement genevois est donc aussi sans risque que le français.
--
-- Une différence avec SIRENE : le REG publie téléphone, email et site web. La
-- fonction les accepte donc, mais toujours par "coalesce" — un numéro corrigé
-- à la main au premier appel survit à tous les ré-imports. L'email est pour la
-- même raison absent de la jumelle SIRENE, qui n'en reçoit jamais.
--
-- Fonction distincte plutôt que paramétrée : la cible du "on conflict" doit
-- être écrite littéralement, un index partiel ne pouvant pas être désigné
-- dynamiquement en SQL pur.
-- ---------------------------------------------------------------------------

create or replace function upsert_prospect_reg(p jsonb) returns uuid as $$
  insert into prospects (
    raison_sociale, enseigne, ide, ref_reg, code_naf, categorie,
    tranche_effectif, adresse, code_postal, ville, code_commune, zone,
    telephone, email, site_web, responsable_nom, source
  )
  values (
    p->>'raison_sociale',
    p->>'enseigne',
    p->>'ide',
    p->>'ref_reg',
    p->>'code_naf',
    coalesce(p->>'categorie', 'autre'),
    p->>'tranche_effectif',
    p->>'adresse',
    p->>'code_postal',
    p->>'ville',
    p->>'code_commune',
    p->>'zone',
    p->>'telephone',
    p->>'email',
    p->>'site_web',
    p->>'responsable_nom',
    'reg'
  )
  on conflict (ref_reg) where ref_reg is not null
  do update set
    raison_sociale   = excluded.raison_sociale,
    enseigne         = excluded.enseigne,
    ide              = excluded.ide,
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
    email            = coalesce(prospects.email, excluded.email),
    site_web         = coalesce(prospects.site_web, excluded.site_web),
    responsable_nom  = coalesce(prospects.responsable_nom, excluded.responsable_nom)
    -- statut, notes, relances, responsable_fonction, converti_client_id et
    -- source : volontairement absents, ils appartiennent à l'équipe.
  returning id;
$$ language sql set search_path = public;
