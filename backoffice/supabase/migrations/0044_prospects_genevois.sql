-- ---------------------------------------------------------------------------
-- Zone « genevois » : la couronne française de Genève (Annemasse Agglo,
-- Communauté de communes du Genevois autour de Saint-Julien, Pays de Gex
-- Agglo). Côté français de la frontière, donc recensée dans SIRENE comme
-- Annecy, mais suivie à part parce que c'est le bassin des frontaliers et des
-- garages qui travaillent avec Genève.
--
-- Purement additive : aucune ligne n'est touchée, la contrainte accepte
-- seulement une valeur de plus.
-- ---------------------------------------------------------------------------

alter table prospects drop constraint prospects_zone_check;
alter table prospects add constraint prospects_zone_check
  check (zone in ('geneve', 'genevois', 'annecy', 'autre'));
