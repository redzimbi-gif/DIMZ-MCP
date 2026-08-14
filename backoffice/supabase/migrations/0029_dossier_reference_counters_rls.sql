-- ---------------------------------------------------------------------------
-- dossier_reference_counters n'avait pas la Row Level Security activée
-- (oubli lors de sa création en 0026) — elle était donc exposée en
-- lecture/écriture via la clé anon. Elle n'est utilisée que côté serveur
-- (client admin + trigger de numérotation), donc l'activer sans policy ne
-- change rien à son fonctionnement, juste ferme l'accès public.
-- ---------------------------------------------------------------------------

alter table dossier_reference_counters enable row level security;
