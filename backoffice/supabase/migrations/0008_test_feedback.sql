-- ---------------------------------------------------------------------------
-- Retours du questionnaire de test utilisateur (site vitrine, avant lancement)
-- Un questionnaire soumis = une ligne. Les métriques qu'on veut pouvoir
-- filtrer/trier sont en colonnes dédiées ; le détail complet (toutes les
-- réponses, y compris les questions ouvertes) est conservé dans
-- donnees_brutes, sur le même principe que dossiers.donnees_brutes.
-- ---------------------------------------------------------------------------

create table test_feedback (
  id uuid primary key default gen_random_uuid(),
  reference text not null default ('DIMZ-TEST-' || to_char(now(), 'YYMMDD') || '-' || lpad((floor(random() * 10000))::text, 4, '0')),

  comprehension_immediate text,
  confiance_site int check (confiance_site between 1 and 5),
  offres_faciles text,
  tarifs_clairs text,
  navigation_facile text,

  note_design_general int check (note_design_general between 1 and 5),
  note_professionnalisme int check (note_professionnalisme between 1 and 5),
  note_logo int check (note_logo between 1 and 5),
  note_couleurs int check (note_couleurs between 1 and 5),
  note_lisibilite int check (note_lisibilite between 1 and 5),
  note_modernite int check (note_modernite between 1 and 5),

  ressenti_duree text,
  hesite_abandonner text,
  note_experience_formulaire int check (note_experience_formulaire between 0 and 10),

  offre_choisie text,
  prix_coherents text,
  meilleur_rapport_qualite_prix text,

  utiliserait_dimz text,
  recommanderait_dimz text,

  note_globale int check (note_globale between 0 and 10),

  duree_secondes int,
  duree_declaree text,

  donnees_brutes jsonb,
  created_at timestamptz not null default now()
);

create unique index test_feedback_reference_idx on test_feedback (reference);
create index test_feedback_created_idx on test_feedback (created_at desc);
