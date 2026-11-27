-- ---------------------------------------------------------------------------
-- Le suivi client du convoyage affiche « Devis en cours » puis, une fois le
-- devis envoyé, remplace ce libellé en place par « Devis envoyé » (même
-- position dans la liste d'étapes, pas une étape barrée en plus) — cf.
-- src/lib/etapes.ts (ETAPES_CONVOYAGE) et src/app/suivi/[token]/page.tsx.
-- Cette colonne pilote ce remplacement d'affichage.
-- ---------------------------------------------------------------------------

alter table dossiers add column if not exists devis_envoye_at timestamptz;
