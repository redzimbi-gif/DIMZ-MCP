-- ---------------------------------------------------------------------------
-- Rapport DIMZ : étoffe les inspections pour qu'elles portent le même
-- contenu que l'exemple présenté sur le site vitrine (score global, score
-- par étape du contrôle, points positifs/vigilance, avis du copilote,
-- verdict final) — le rapport back-office et celui envoyé au client sont
-- donc désormais le même document, éditable avant envoi.
-- ---------------------------------------------------------------------------

alter table inspections
  add column if not exists reference text,
  add column if not exists lieu text,
  add column if not exists expert_nom text,
  add column if not exists duree_sur_site text,
  add column if not exists vehicule_titre text,
  add column if not exists annonce_comparee text,
  add column if not exists tags text,
  add column if not exists score_administratif numeric(3,1) check (score_administratif between 0 and 10),
  add column if not exists score_exterieur numeric(3,1) check (score_exterieur between 0 and 10),
  add column if not exists score_interieur numeric(3,1) check (score_interieur between 0 and 10),
  add column if not exists score_mecanique numeric(3,1) check (score_mecanique between 0 and 10),
  add column if not exists score_essai_routier numeric(3,1) check (score_essai_routier between 0 and 10),
  add column if not exists score_marche numeric(3,1) check (score_marche between 0 and 10),
  add column if not exists points_positifs text,
  add column if not exists points_vigilance text,
  add column if not exists avis_copilote text,
  add column if not exists verdict text check (verdict in ('recommande', 'envisageable', 'deconseille')),
  add column if not exists recommandation_finale text;

update inspections
set reference = 'DIMZ-RPT-' || to_char(created_at, 'YYYY') || '-' || lpad((floor(random() * 10000))::text, 4, '0')
where reference is null;

alter table inspections
  alter column reference set not null,
  alter column reference set default (
    'DIMZ-RPT-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 10000))::text, 4, '0')
  );

create unique index if not exists inspections_reference_idx on inspections (reference);
