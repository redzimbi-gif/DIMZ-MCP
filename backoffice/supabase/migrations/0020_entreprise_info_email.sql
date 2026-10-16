-- ---------------------------------------------------------------------------
-- Adresse e-mail officielle de contact (contact@dimz-copilote.com), au lieu
-- de l'adresse personnelle utilisée précédemment comme valeur par défaut.
-- ---------------------------------------------------------------------------

update entreprise_info
set email = 'contact@dimz-copilote.com', updated_at = now()
where id = 1;
