-- ---------------------------------------------------------------------------
-- Copilote Market / Copilote + Market : commentaire libre du copilote,
-- affiché entre l'intro et la liste des annonces sélectionnées sur le PDF
-- envoyé au client (même principe que fiche_decouverte_intro). Un seul champ
-- réutilisé pour les deux variantes puisqu'un dossier n'a qu'une offre
-- active à la fois.
-- ---------------------------------------------------------------------------

alter table dossiers add column if not exists market_commentaire text;
