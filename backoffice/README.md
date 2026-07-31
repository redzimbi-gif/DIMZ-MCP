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
3. Dans **Project Settings → API**, récupère :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (⚠️ secrète) → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Créer ton compte administrateur

Dans Supabase : **Authentication → Users → Add user**, crée un utilisateur
avec ton email et un mot de passe. C'est ce compte qui te connecte au
back-office (pas d'inscription libre : les comptes se créent uniquement
depuis le dashboard Supabase pour l'instant).

## 3. Configurer les variables d'environnement

```bash
cp .env.local.example .env.local
```

Remplis les 3 valeurs récupérées à l'étape 1.

## 4. Lancer en local

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000), connecte-toi avec le
compte créé à l'étape 2.

## 5. Déployer sur Vercel

1. Pousse ce dépôt sur GitHub (déjà fait si tu lis ce fichier depuis le repo).
2. Sur [vercel.com](https://vercel.com) → **Add New Project** → importe le
   dépôt → **Root Directory : `backoffice`**.
3. Ajoute les 3 variables d'environnement (mêmes valeurs que `.env.local`).
4. Déploie. Vercel te donne une URL du type `https://dimz-backoffice.vercel.app`.

## 6. Connecter le site vitrine

Dans `dimz-beta.html` (à la racine du dépôt), tout en haut du `<script>` :

```js
var BACKOFFICE_URL = 'https://dimz-backoffice.vercel.app';
```

Chaque soumission des formulaires « Accompagnement » et « Convoyage » du site
créera automatiquement un client + un dossier dans le back-office.

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
- Inspection : formulaire complet + génération automatique d'un rapport PDF
  avec le logo DIMZ.
- Convoyage : trajet, photos avant/après, signature client (à l'écran), rapport
  de livraison PDF.
- Agenda : calendrier mensuel (rendez-vous, visio, inspections, convoyages,
  livraisons).
- Documents : bibliothèque liée aux dossiers.
- Suivi client : page publique `/suivi/[token]` avec la checklist d'avancement,
  lien à partager avec le client (`/dossiers/[id]` → bouton « Suivi client »).
- Formulaire du site → dossier créé automatiquement (`/api/public/lead`).
- Journal des actions (`activity_log`) et notifications internes.

## Ce qui n'est volontairement pas dans cette V1

Ces modules demandent tes propres comptes/clés API tiers (payants) — on les
ajoute dès que tu es prêt :

- **Facturation** (devis, factures, paiement en ligne) → nécessite Stripe.
- **Emails automatiques** (confirmation client, rappels, demande d'avis) →
  nécessite un service d'envoi (ex. Resend, Postmark).
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
