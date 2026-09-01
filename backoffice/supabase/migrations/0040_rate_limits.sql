-- ---------------------------------------------------------------------------
-- Limite de fréquence pour les points d'entrée publics (formulaires du site
-- vitrine, sans authentification). Fenêtre fixe : chaque appel upsert la
-- ligne (ip, endpoint, fenêtre de 10 min) et incrémente son compteur ; le
-- code appelant refuse la requête si le compteur dépasse la limite prévue
-- pour cet endpoint. Une seule table sert les six points d'entrée publics
-- (contact-faq, lead-intake, api/public/lead, avis, test-feedback,
-- track-lookup) : "endpoint" distingue leurs compteurs respectifs.
-- ---------------------------------------------------------------------------

create table rate_limits (
  ip text not null,
  endpoint text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (ip, endpoint, window_start)
);

-- Purge les fenêtres expirées : appelée par chaque fonction avant sa propre
-- vérification, avec une probabilité de 1/20 (pas besoin qu'un ménage ait
-- lieu à chaque requête pour rester efficace, et ça évite un job cron séparé
-- pour une table dont le volume reste faible).
create or replace function cleanup_rate_limits() returns void as $$
  delete from rate_limits where window_start < now() - interval '1 hour';
$$ language sql;

-- Incrémente atomiquement le compteur de la fenêtre courante et renvoie sa
-- nouvelle valeur. Un upsert lu-puis-écrit depuis le code appelant serait
-- sujet à une condition de course si deux requêtes de la même IP arrivent en
-- même temps (compteur incrémenté une seule fois au lieu de deux) ; ce risque
-- disparaît en faisant l'incrément dans une seule instruction SQL.
create or replace function increment_rate_limit(p_ip text, p_endpoint text, p_window timestamptz)
returns int as $$
  insert into rate_limits (ip, endpoint, window_start, count)
  values (p_ip, p_endpoint, p_window, 1)
  on conflict (ip, endpoint, window_start)
  do update set count = rate_limits.count + 1
  returning count;
$$ language sql;
