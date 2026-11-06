-- ---------------------------------------------------------------------------
-- Le commentaire libre du Copilote Market / Copilote + Market doit rester
-- distinct entre les deux offres (un dossier qui passe de Copilote à
-- Copilote Plus ne doit pas perdre/écraser le commentaire de la 1ʳᵉ offre).
-- Remplace la colonne unique market_commentaire (0016) par deux colonnes.
-- ---------------------------------------------------------------------------

alter table dossiers add column if not exists market_commentaire_copilote text;
alter table dossiers add column if not exists market_commentaire_copilote_plus text;
alter table dossiers drop column if exists market_commentaire;
