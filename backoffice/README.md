# Dimz — Back-office (CRM interne)

CRM automobile interne pour DIMZ : dossiers clients, recherche de véhicules,
inspections, convoyages, agenda, documents, suivi client. Construit en
Next.js 14 (App Router) + Supabase (base de données Postgres, authentification,
stockage de fichiers), pensé pour être hébergé gratuitement sur Vercel.

## 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → **New project**.
2. Une fois le projet créé, ouvre **SQL Editor** et exécute, dans l'ordre,
   le contenu de chaque fichier de `supabase/migrations/` :
   - `0001_init.sql`
   - `0002_storage.sql`
   - `0003_lead_intake.sql`
   - `0004_convoyages_externes.sql`
   - `0005_agenda_convoyage_externe.sql`
   - `0006_comptabilite_justificatifs.sql`
   - `0007_rapport_dimz.sql`
3. Dans **Project Settings → API**, récupère :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (⚠️ secrète) → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Créer ton compte administrateur

Dans Supabase : **Authentication → Users → Add user**, crée un utilisateur
avec ton email et un mot de passe. C'est ce compte qui te connecte au
back-office (pas d'inscription libre : les comptes se créent uniquement
depuis le dashboard Supabase pour l'instant).

## 3. Créer ton compte Resend (envoi d'emails)

1. Va sur [resend.com](https://resend.com) → crée un compte gratuit
   (100 emails/jour offerts).
2. **API Keys → Create API Key**, copie la clé → `RESEND_API_KEY`.
3. Tant que tu n'as pas encore de nom de domaine à vérifier sur Resend,
   laisse `EMAIL_FROM=DIMZ <onboarding@resend.dev>` : ça fonctionne tout de
   suite, mais Resend n'autorisera l'envoi qu'à l'adresse email de ton propre
   compte (utile pour tester). Le jour où tu as un domaine, ajoute-le dans
   **Domains** sur Resend, suis les enregistrements DNS demandés, puis
   change `EMAIL_FROM` pour une adresse de ce domaine (ex.
   `DIMZ <contact@dimz.fr>`) — l'envoi à n'importe quel client se débloque
   automatiquement, sans autre changement de code.

## 4. Configurer les variables d'environnement

```bash
cp .env.local.example .env.local
```

Remplis les valeurs récupérées aux étapes 1 et 3. `NEXT_PUBLIC_APP_URL` peut
rester tel quel en local ; mets l'URL Vercel une fois déployé (étape 6).

## 5. Lancer en local

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000), connecte-toi avec le
compte créé à l'étape 2.

## 6. Déployer sur Vercel

1. Pousse ce dépôt sur GitHub (déjà fait si tu lis ce fichier depuis le repo).
2. Sur [vercel.com](https://vercel.com) → **Add New Project** → importe le
   dépôt → **Root Directory : `backoffice`**.
3. Ajoute toutes les variables d'environnement (mêmes valeurs que `.env.local`)
   — pense à mettre `NEXT_PUBLIC_APP_URL` sur l'URL Vercel une fois connue
   (tu peux redéployer après coup pour la corriger).
4. Déploie. Vercel te donne une URL du type `https://dimz-backoffice.vercel.app`.

## 7. Connecter le site vitrine

Le site vitrine (`dimz-beta.html`) n'appelle pas directement le back-office
Vercel : il appelle une **Edge Function Supabase** (`supabase/functions/lead-intake`),
pour contourner la protection par mot de passe de Vercel qui bloquerait un
visiteur anonyme. C'est cette fonction qui crée le client + dossier, **et
maintenant aussi qui envoie l'email de confirmation** — c'est donc elle qu'il
faut redéployer (pas juste Vercel) à chaque changement de ce fichier.

Dans `dimz-beta.html`, tout en haut du `<script>` :

```js
var BACKOFFICE_URL = 'https://TON-PROJET.supabase.co/functions/v1/lead-intake';
```

Pour déployer/mettre à jour la fonction (CLI Supabase, `npx supabase login` puis) :

```bash
npx supabase functions deploy lead-intake --project-ref TON-PROJET --no-verify-jwt
```

Et donne-lui ses propres variables d'environnement (distinctes de celles de
Vercel — les Edge Functions ne lisent pas `.env.local`) :

```bash
npx supabase secrets set --project-ref TON-PROJET \
  RESEND_API_KEY=re_... \
  EMAIL_FROM="DIMZ <onboarding@resend.dev>" \
  APP_URL=https://dimz-backoffice.vercel.app
```

Chaque soumission des formulaires « Accompagnement » et « Convoyage » du site
créera automatiquement un client + un dossier dans le back-office, et enverra
l'email de confirmation si le client a renseigné son adresse.

## Ce qui est inclus (V1)

- Authentification admin (Supabase Auth), toutes les pages protégées.
- Tableau de bord : dossiers nouveaux/en cours/terminés, CA, convoyages à
  venir, livraisons du jour, notifications, dernières activités.
- Clients : fiche complète, historique des dossiers, documents, notes privées,
  historique des échanges.
- Dossiers : pipeline en 10 statuts (kanban), historique des changements de
  statut, infos projet complètes.
- Recherche de véhicules : annonces avec photos, avis du copilote, points
  forts/faibles, score de confiance, sélection.
- Inspection = Rapport DIMZ : même contenu riche que l'exemple du site (score
  global, score par étape du contrôle, tags, points positifs/vigilance, avis
  du copilote, verdict), entièrement éditable depuis le back-office, avec
  génération automatique d'un rapport PDF au même format.
- Convoyage : trajet, photos avant/après, signature client (à l'écran), rapport
  de livraison PDF.
- Agenda : calendrier mensuel (rendez-vous, visio, inspections, convoyages,
  livraisons).
- Documents : bibliothèque liée aux dossiers.
- Suivi client : page publique `/suivi/[token]` avec la checklist d'avancement,
  lien à partager avec le client (`/dossiers/[id]` → bouton « Suivi client »).
- Formulaire du site → dossier créé automatiquement (`/api/public/lead`).
- Journal des actions (`activity_log`) et notifications internes.
- Emails automatiques (via Resend) :
  - confirmation envoyée au client dès qu'il soumet un formulaire du site ;
  - bouton « Envoyer au client » sur une inspection ou un convoyage → email
    avec le rapport PDF en pièce jointe ;
  - bouton « Informer le client » sur un dossier → email avec le statut
    actuel et un lien vers son espace de suivi.

## Ce qui n'est volontairement pas dans cette V1

Ces modules demandent tes propres comptes/clés API tiers (payants) — on les
ajoute dès que tu es prêt :

- **Facturation** (devis, factures, paiement en ligne) → nécessite Stripe.
- **SMS** → nécessite Twilio ou équivalent.
- **Signature électronique légale** (au-delà de la signature à l'écran déjà
  en place pour le convoyage) → nécessite un prestataire type Yousign/DocuSign.
- **Gestion fine des rôles** (commercial / inspecteur / convoyeur avec accès
  limités) : la colonne `role` existe déjà en base, l'interface d'admin des
  rôles reste à construire.

## Notes techniques

- Toutes les requêtes de données passent par le serveur Next.js avec la clé
  `service_role` (jamais exposée au navigateur). Le navigateur ne parle à
  Supabase que pour l'authentification. RLS est activé sur toutes les tables.
- Les fichiers (photos, vidéos, signatures, documents) sont stockés dans un
  bucket Supabase Storage privé (`dimz-files`) et servis via des URLs signées
  temporaires générées côté serveur.
- Le champ `dossiers.donnees_brutes` conserve l'intégralité de chaque
  soumission de formulaire du site, même les champs qui ne sont pas encore
  mappés vers une colonne dédiée — rien n'est jamais perdu.
