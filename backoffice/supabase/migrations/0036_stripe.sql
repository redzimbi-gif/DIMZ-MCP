-- Paiement en ligne des factures (documents_commerciaux) via Stripe Checkout.
-- Le lien de paiement est créé à l'envoi d'une facture ; le webhook Stripe
-- passe le statut à "paye" automatiquement à la confirmation du paiement.

alter table documents_commerciaux
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text;

create index if not exists documents_commerciaux_stripe_session_idx
  on documents_commerciaux (stripe_checkout_session_id);
