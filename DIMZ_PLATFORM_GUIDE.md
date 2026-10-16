# DIMZ Platform: Complete Technical & Functional Guide

## Executive Summary

DIMZ is a French automotive acquisition accompaniment SaaS platform. Users select a service tier, receive personalized support throughout the buying process, and pay for premium services. The platform consists of:

- **Public Site** (HTML/CSS): Marketing, offer presentation, client intake form
- **Back Office** (Next.js + Supabase): Staff CRM, document management, invoice creation, payment processing
- **Client Portal** (/suivi/[token]): Real-time progress tracking, document access, stage updates

The system bridges marketing (lead intake) → internal workflow (staff pipeline) → client experience (journey tracking) → payment (Stripe integration).

---

## Part 1: Core Concepts

### 1.1 Dossier (Project/Case)

A **dossier** represents one client and their acquisition journey. Key fields:

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Unique identifier |
| `reference` | TEXT | Human-readable ticket (e.g., "DIZ-2024-00001") |
| `offre` | ENUM | Service tier: `decouverte`, `copilote`, `copilote_plus`, `expertise_seule`, `convoyage_seul` |
| `statut` | TEXT | Internal pipeline state (10 values, staff-visible only) |
| `etape_client` | TEXT | Client-visible journey stage (varies by offer) |
| `paiement_recu_at` | TIMESTAMPTZ | When this offer was paid (NULL = unpaid) |
| `paiement_offre` | ENUM | Which offer was paid (critical for upgrades) |
| `portal_token` | TEXT | Secure URL token for client portal (/suivi/[token]) |
| `client_id` | UUID | FK → clients table |

### 1.2 Client

Represents a person seeking vehicle acquisition help:

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Unique identifier |
| `prenom` | TEXT | First name (used in emails) |
| `nom` | TEXT | Last name |
| `email` | TEXT | Contact email (for invoices, updates) |
| `telephone` | TEXT | Phone number |
| `entreprise_id` | UUID | FK → enterprise (sales staff) |

### 1.3 Étape (Journey Stage)

Each offer has a **sequence of visible stages** that the client follows:

**Découverte (Free, 4 stages):**
- Demande reçue
- Traitement en cours
- Exploration des annonces
- Réponse envoyée

**Copilote (€99–€149, 7 stages):**
- Demande reçue
- **En attente du paiement** ← New (payment step)
- Traitement en cours
- Exploration des annonces
- Recherche avancée
- Rédaction du dossier
- Dossier envoyé

**Copilote Plus (€599+, 11 stages):**
- All Copilote stages +
- Mise en relation avec vendeur
- Inspection du véhicule
- Achat du véhicule
- Démarches administratives
- Livraison du véhicule

**Expertise Seule (Paid, 3 stages):**
- Similar payment flow to Copilote

**Convoyage Seul (Separate flow, 5 stages):**
- Demande reçue
- Étude de votre recherche
- Devis en cours / Devis envoyé
- Confirmé / Refusé
- Livraison

### 1.4 Statut (Internal Pipeline Status)

10 internal states used for reporting/kanban, independent from client-visible étapes:

1. `demande_recue` — Initial intake
2. `analyse_besoin` — Staff analyzing client needs (search criteria, budget)
3. `recherche_en_cours` — Active vehicle search
4. `resultat_presente` — Candidate vehicles identified
5. `client_decision` — Awaiting client decision
6. `dossier_envoye` — Client has selection, dossier prepared
7. `achat_confirme` — Vehicle purchase confirmed
8. `admin_en_cours` — Administrative processing (registration, insurance)
9. `livraison_en_cours` — Vehicle en route to client
10. `dossier_termine` — Closed (purchased/abandoned)

The mapping from étape_client to statut is deterministic: `STATUT_PAR_ETAPE_ACCOMPAGNEMENT` dict (see Section 3.1).

---

## Part 2: Offer Types & Client Journeys

### 2.1 Découverte (Free Tier)

**Purpose:** Low-friction market research. Client gets vehicle recommendations without staff involvement (automated or minimal).

**Journey:**
1. Client fills intake form on site → creates dossier with `offre="decouverte"`
2. Client portal shows timeline with 4 stages
3. Staff reviews occasionally but doesn't actively manage search
4. Client sees stage progression toward "Réponse envoyée"
5. No payment required, no payment step

**Entry Point:** Site form selection or staff creating manually

### 2.2 Copilote (€99 or €149)

**Purpose:** Staff-assisted vehicle search. Staff actively searches, curates options, prepares dossier summary.

**Pricing:**
- Standard: €99
- Complex (specific vehicle, exotic criteria): €149
- Team decides amount at invoice time

**Journey:**
1. Client upgrades from Découverte OR selects Copilote on site form
2. **New in dossier:**
   - `etape_client = "paiement_en_attente"`
   - `offre = "copilote"`
   - `paiement_recu_at = NULL`, `paiement_offre = NULL`
3. Timeline shows payment stage as first step + explanation card
4. Client receives invoice email with Stripe checkout link
5. Client pays (or declines)
   - If paid: paiement_recu_at set, paiement_offre="copilote", etape advances to "Traitement en cours"
   - If declined: stays in payment stage until paid
6. Staff conducts search → finds vehicles → prepares dossier
7. Client sees live progress: stage by stage
8. Final stage: "Dossier envoyé" with vehicle recommendations

**Payment:**
- Triggered by: upgrade click on portal OR staff action on back office
- Invoice sent: Staff enters montant (default 99€, adjustable)
- Webhook: Stripe confirms payment → advances étape automatically

### 2.3 Copilote Plus (€599+)

**Purpose:** Full-service accompaniment from search through delivery. Most intensive tier.

**Pricing:**
- Base: €599
- Varies by complexity, less any Copilote payment already made
- Example: Upgrade Copilote (€99) → Copilote Plus: invoice shows €500 (599 - 99)

**Journey:**
1. Client upgrades from Copilote → dossier now has:
   - `etape_client = "paiement_en_attente"`
   - `offre = "copilote_plus"`
   - `paiement_recu_at = NULL` (reset, even if Copilote was paid)
   - `paiement_offre = "copilote"` (old payment, still remembered)
2. Back office calculates: `getMontantDejaPaye(dossier)` → sum of paid factures
3. Invoice montant suggestion: 599 - 99 = €500
4. Same payment flow as Copilote
5. Once paid: proceeds through 11 stages including:
   - Direct vendor contact
   - Vehicle inspection (staff or inspector)
   - Purchase negotiation
   - Administrative handoff
   - Delivery coordination
6. Client receives updates at each milestone

### 2.4 Expertise Seule (Vehicle Inspection Only)

**Purpose:** One-off inspection service for used vehicles (applies pre/post-purchase).

**Journey:** Similar to Copilote (payment step → inspection → report). Less stages.

### 2.5 Convoyage Seul (Vehicle Delivery)

**Purpose:** Standalone vehicle delivery/transport service.

**Journey:** Separate flow using **devis (quote)** system, not payment step:
- Demande reçue
- Étude de votre recherche
- Devis en cours → Devis envoyé (staff creates quote)
- Accepté → Livraison
- Completed

**Why separate?** Multiple invoices may exist (convoyage + repair + storage). Webhook guards prevent spurious étape advances.

---

## Part 3: The Payment System (New Feature)

### 3.1 Motivation

Previously: Paid offers (Copilote/Plus) had no payment gating. Client clicked "upgrade" → instantly became Copilote, with staff manually sending invoices outside the workflow. Two silos:
- Client journey: offre changed
- Billing: facture created, maybe paid, maybe not — unconnected

**Now:** Payment step is **integrated into the journey.** Client cannot proceed until paid; webhook automates étape advancement.

### 3.2 Core Logic: `besoinPaiementOffre(offre, paiementOffre)`

**Single source of truth:**
```
function besoinPaiementOffre(offre, paiementOffre) {
  // Offer requires payment if:
  // 1. It's a paid offer (copilote or copilote_plus)
  // 2. It hasn't been paid yet (paiementOffre !== offre)
  
  const paidOffers = ["copilote", "copilote_plus"];
  return paidOffers.includes(offre) && paiementOffre !== offre;
}
```

**Used by:**
- `etapeApresChangementOffre()`: When offer changes, decide first étape
- `updateDossierOffre()`: When staff changes offer pill
- `upgradeOffreDepuisSuivi()`: When client upgrades on portal
- `POST /api/public/lead`: When new dossier arrives from site form

**Result:**
- If true: `etape_client = "paiement_en_attente"`
- If false: `etape_client = "traitement_en_cours"` (or first real working stage)

### 3.3 Payment Step Visibility

**Timeline resolution:** `resolveEtapesOffre(offre, paiementOffre)`

Takes the offer's stage list and:
1. Shows all stages normally
2. **If paid:** replaces "En attente du paiement" label with "Paiement reçu" (still at same position)
3. **If unpaid:** leaves "En attente du paiement" as-is

Result: Single payment step, label changes on receipt, no duplication.

### 3.4 Deduction Logic: `getMontantDejaPaye(dossierId)`

Sums all paid factures for the dossier:
```sql
SELECT COALESCE(SUM(montant_ttc), 0)
FROM documents_commerciaux
WHERE dossier_id = ? AND type = 'facture' AND statut = 'paye'
```

Used to calculate upgrade cost:
- Copilote (€99) → Copilote Plus (€599): invoice = 599 - 99 = €500
- Copilote (€149) → Copilote Plus (€599): invoice = 599 - 149 = €450

### 3.5 Workflow: Team Sends Invoice

**Trigger:** Staff sees "Le client attend son lien de paiement pour l'offre Copilote Plus" card on dossier detail.

**Steps:**
1. **Back office shows:**
   - Current offer montant default (TARIF_OFFRE_DEFAUT[offre])
   - Minus any prior payments (getMontantDejaPaye)
   - Editable montant field
   - Button: "Créer et envoyer la facture"

2. **Staff action:** Enters or confirms montant, clicks button

3. **Server action (`demanderPaiementOffre`):**
   - Creates row in documents_commerciaux:
     - `type = 'facture'`
     - `dossier_id` = this dossier
     - `montant_ttc` = staff-entered amount
     - `statut = 'envoye'` (not yet paid)
   - Calls `envoyerDocument(facture_id)` → sends email to client
   - Email includes PDF + Stripe checkout link (Stripe amount is from Stripe's own admin, cross-checked)
   - Redirects back with success banner

4. **Client receives:**
   - PDF with invoice details
   - Stripe link to pay
   - Secure payment form (no credentials stored by DIMZ)

### 3.6 Workflow: Payment Reception (Webhook)

**Trigger:** Client completes Stripe checkout → Stripe calls `/api/stripe/webhook`

**Webhook steps:**
1. Verify HMAC signature (prevents spoofing)
2. Fetch the Stripe session + line items
3. Find matching facture in documents_commerciaux by stripe_payment_intent_id
4. Mark facture `statut = 'paye'`, store `stripe_payment_intent_id`

5. **If facture has dossier_id:** Call `enregistrerPaiementOffre(db, dossier_id, montant_ttc)`
   - Load dossier
   - **Guard:** If `etape_client !== "paiement_en_attente"`, exit (only advance payment-awaiting dossiers)
   - Update dossier:
     - `paiement_recu_at = now()`
     - `paiement_offre = offre` (remember what was paid)
     - `etape_client = etapeApresPaiement(offre)` (usually "traitement_en_cours")
   - Call `syncStatutAvecEtape()` → update internal statut (e.g., demande_recue → analyse_besoin)
   - Insert dossier_etape_history row for audit trail
   - Send **single** email to client:
     - "Paiement reçu" + montant confirmation
     - "Votre dossier est lancé" + next étape message (e.g., "Notre copilote prend connaissance de votre demande")
   - `logActivity` (staff notifications, audit)

6. **No duplicate staff notification** — webhook already told staff facture was paid

**Result:** Client portal auto-refreshes → sees timeline updated: payment stage now "Paiement reçu" ✓, next stage "En cours" with icon.

### 3.7 Client Experience: Stripe Return

**Redirect:** Stripe sends client back to `/suivi/[token]?paiement=succes` or `?paiement=annule`

**Page handling:**
- `?paiement=succes`: Green banner "Merci, votre paiement a bien été reçu"
- `?paiement=annule`: Neutral "Votre lien de paiement reste actif, n'hésitez pas à payer"
- When banner shown, clear searchParams so refresh doesn't re-show

### 3.8 Idempotence & Guards

**Webhook re-emission:** If Stripe retries webhook (network glitch), the webhook handler:
1. Checks if facture.statut === "paye" before updating → exits early if already processed
2. Even if `enregistrerPaiementOffre` runs twice:
   - Guard checks `etape_client === "paiement_en_attente"`
   - After first run, étape is "traitement_en_cours" → second run exits → no double-advance

**Other dossier invoices:** Convoyage, repair invoices, etc. have `dossier_id = NULL` or are on non-payment-awaiting dossiers:
- Webhook marks them paid but `enregistrerPaiementOffre` never called → no spurious étape advance

---

## Part 4: Architecture & Tech Stack

### 4.1 Hosting & Deployment

| Component | Platform | Notes |
|-----------|----------|-------|
| Next.js App (back office) | Vercel | Serverless, auto-scales, free tier available |
| Database | Supabase | PostgreSQL, managed, free tier (500 MB), RLS policies |
| File Storage | Supabase Storage | PDFs, photos, secure URLs |
| Email | Resend API | 100 emails/day free, custom domain support |
| Payments | Stripe | No SDK in code, raw HTTP + HMAC verification |
| Auth | Supabase Auth | JWT tokens, staff login |

### 4.2 Key Libraries

```
Next.js 14 (App Router)
React 19
TypeScript
Supabase JS client (@supabase/supabase-js)
Server Actions (form submissions)
Resend (email)
```

### 4.3 Code Organization

```
backoffice/
├── src/
│   ├── app/
│   │   ├── (app)/                    # Protected routes (staff)
│   │   │   ├── dossiers/             # Dossier list & detail
│   │   │   ├── facturation/          # Invoice management
│   │   │   ├── agenda/               # Calendar
│   │   │   └── ...
│   │   ├── suivi/                    # Client portal (public token URL)
│   │   ├── api/
│   │   │   ├── stripe/webhook/       # Payment webhook
│   │   │   └── public/lead/          # Site form intake
│   │   ├── auth/                     # Login/logout
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── supabase/                 # DB clients
│   │   ├── etapes.ts                 # Journey stage logic
│   │   ├── types.ts                  # TypeScript interfaces
│   │   ├── queries.ts                # Reusable DB queries
│   │   ├── paiement-dossier.ts       # Payment bridge (Stripe → dossier)
│   │   ├── email.ts & email-templates.ts  # Email sending & templates
│   │   ├── dossier-statut.ts         # Status sync logic
│   │   ├── log.ts                    # Activity logging
│   │   └── format.ts                 # Utility functions
│   └── components/
│       ├── EmailStatusBanner.tsx     # Feedback after invoice action
│       └── ... (UI components)
├── supabase/
│   └── migrations/                   # DDL scripts (0001–0038)
└── .env.local.example                # Env var template
```

### 4.4 Database Schema Highlights

**Core tables:**
- `dossiers` — Client projects (offre, statut, etape_client, paiement_recu_at, paiement_offre, etc.)
- `clients` — Person details (email, phone, name)
- `documents_commerciaux` — Invoices, factures (type, statut, montant_ttc, stripe_payment_intent_id, dossier_id)
- `dossier_etape_history` — Audit log (who changed what stage when, with note)
- `staff_users` — Team members (email, role, enterprise_id)
- Multiple specialized tables: convoyage, agenda, photos, etc.

**Key columns for payment:**
- `dossiers.paiement_recu_at` (TIMESTAMPTZ)
- `dossiers.paiement_offre` (dossier_offre ENUM)
- `documents_commerciaux.stripe_payment_intent_id` (TEXT)
- `documents_commerciaux.montant_ttc` (DECIMAL)

---

## Part 5: Key Workflows & Data Flow

### 5.1 New Dossier from Site Form

```
[Public Site] → /api/public/lead POST
  ↓
  Extract: email, budget, criteria, selected_offre
  ↓
  Create dossier:
    offre = selected_offre
    etape_client = besoinPaiementOffre(offre, null) 
                   ? "paiement_en_attente" 
                   : "traitement_en_cours"
    paiement_recu_at = NULL
    paiement_offre = NULL
  ↓
  Create client if new
  ↓
  Generate portal_token
  ↓
  Send welcome email (no invoice yet)
  ↓
  Client portal shows timeline:
    - If Copilote/Plus: payment step first
    - If Découverte: traitement starts immediately
```

### 5.2 Client Upgrade on Portal

```
Client on /suivi/[token] → Clicks "Passer à l'offre Copilote"
  ↓
  Server Action: upgradeOffreDepuisSuivi(portalToken, newOffre)
  ↓
  Load dossier by token
  ↓
  Update dossier:
    offre = newOffre
    etape_client = besoinPaiementOffre(newOffre, paiement_offre)
                   ? "paiement_en_attente"
                   : "traitement_en_cours"
  ↓
  Insert dossier_etape_history row
  ↓
  Notify staff: "Client upgraded to Copilote, awaiting payment link"
  ↓
  Redirect to portal with new timeline
```

### 5.3 Staff Creates & Sends Invoice

```
Staff on /dossiers/[id] → Sees payment card
  ↓
  Montant pre-filled: TARIF_OFFRE_DEFAUT[offre] - getMontantDejaPaye(dossier)
  ↓
  Staff confirms or edits montant → Clicks "Créer et envoyer la facture"
  ↓
  Server Action: demanderPaiementOffre(dossierId, formData)
  ↓
  Create documents_commerciaux row:
    type = "facture"
    dossier_id = dossierId
    montant_ttc = staff_montant
    statut = "envoye"
  ↓
  Call envoyerDocument(facture_id)
  ↓
  Email to client includes:
    PDF with invoice
    Stripe secure checkout link
    Explanation: "Cliquez ci-dessous pour payer en ligne"
  ↓
  Redirect with success banner
```

### 5.4 Payment via Stripe

```
Client receives email → Clicks Stripe link → Checkout page
  ↓
  Client enters card details (Stripe handles, DIMZ never sees card)
  ↓
  Client confirms → Stripe processes
  ↓
  Success page (Stripe redirects back):
    /suivi/[token]?paiement=succes
  ↓
  Client sees green banner: "Merci, votre paiement a bien été reçu"
```

### 5.5 Webhook: Payment Confirmation

```
Stripe sends event → /api/stripe/webhook
  ↓
  Verify HMAC signature
  ↓
  Extract session ID, amount, metadata
  ↓
  Find facture by stripe_payment_intent_id
  ↓
  Update facture:
    statut = "paye"
  ↓
  If facture.dossier_id exists:
    Call enregistrerPaiementOffre(db, dossier_id, montant_ttc)
    ↓
    Load dossier
    ↓
    Guard: etape_client === "paiement_en_attente"?
      YES → Continue
      NO → Exit (other dossier type, no advance)
    ↓
    Update dossier:
      paiement_recu_at = now()
      paiement_offre = offre
      etape_client = etapeApresPaiement(offre)  // e.g., "traitement_en_cours"
    ↓
    syncStatutAvecEtape(db, dossierId, offre, newEtape)
    ↓
    Insert dossier_etape_history: "Paiement reçu (€99), passage à traitement"
    ↓
    Send paiementConfirmeEmail:
      Subject: "Votre paiement a bien été enregistré"
      Body: Confirmation + next étape details
    ↓
    logActivity: Staff auditing
  ↓
  Return 200 OK to Stripe
  ↓
  Client portal auto-refreshes (polling or WebSocket):
    Timeline updates: payment stage shows "Paiement reçu" ✓
    Next stage shows "En cours"
```

### 5.6 Upgrade with Deduction (Copilote → Copilote Plus)

```
Client on /suivi/[token] → Clicks "Passer à Copilote Plus"
  ↓
  Current dossier state:
    offre = "copilote"
    paiement_recu_at = 2024-08-15
    paiement_offre = "copilote"
  ↓
  upgradeOffreDepuisSuivi:
    offre = "copilote_plus"
    etape_client = besoinPaiementOffre("copilote_plus", "copilote")
                 → true (Plus not paid yet)
                 → "paiement_en_attente"
    paiement_offre still = "copilote" (remember old payment)
  ↓
  Back office shows payment card:
    Montant = TARIF_OFFRE_DEFAUT["copilote_plus"] - getMontantDejaPaye()
            = 599 - 99 (old Copilote payment)
            = 500 €
  ↓
  Staff confirms → Invoice for €500 created
  ↓
  Client pays €500
  ↓
  Webhook:
    paiement_recu_at = now()
    paiement_offre = "copilote_plus"
    etape_client = "traitement_en_cours"
  ↓
  Client now has:
    Full timeline with all 11 Copilote Plus stages
    Pagination continuing from prior Copilote work (etape updates)
```

---

## Part 6: Key Features by Module

### 6.1 Dossiers (CRM Core)

**List view:** Kanban by statut (demande_recue, analyse_besoin, etc.) + search/filter

**Detail view:**
- Client info (name, email, phone, criteria, budget)
- Offer selector (with payment card if awaiting payment)
- Timeline of étapes (actual journey)
- Documents (PDFs, photos, contracts)
- Etape history (audit log)
- Notes field

**When payment step active:**
- Orange card: "Le client attend son lien de paiement pour l'offre Copilote Plus"
- Montant input (pre-filled with TARIF_DEFAUT - prior payments)
- Button: "Créer et envoyer la facture"

### 6.2 Facturation (Document Management)

**List view:** All factures, devis, contracts, etc. by type/status

**Actions:** Send to client (email + Stripe link), track payment, download PDF

**Integration with payment:** Envoi creates Stripe session link, webhook marks paid when Stripe confirms

### 6.3 Suivi Client (Client Portal)

**URL:** `/suivi/[token]` (public, no login required)

**Display:**
- Dossier reference & offer
- Timeline of étapes with checkmarks (completed) and current indicator
- Explanation cards for current stage
- Downloadable documents
- Contact form for questions

**When in payment step:**
- Explanation card: "Votre facture et son lien de paiement sécurisé vous sont envoyés par email. Vous pouvez payer en ligne en toute sécurité via Stripe."
- (No send button on portal — team sends from back office)

**Stripe return handling:**
- `?paiement=succes` → green banner
- `?paiement=annule` → neutral message
- Awaits webhook (seconds) to update timeline

### 6.4 Agenda

**Calendar view:** All dossiers' key events (inspection dates, delivery, admin appointments)

**Event types:** `inspection`, `livraison`, `demarche_admin`, `rdv_client`, `conge` (staff vacation)

**Enum:** Fixed enum with all types (including `conge` after migration 0037 fix)

---

## Part 7: Common Gotchas & Design Patterns

### 7.1 Why `paiement_offre` Field?

Without it, upgrading Copilote (99€, paid) → Copilote Plus (599€, unpaid) would incorrectly think Plus was already paid.

**Solution:** `paiement_offre` tracks *which offer* was paid. Upgrade sets `paiement_offre = "copilote"` (old) while `offre = "copilote_plus"` (new). `besoinPaiementOffre` compares them: "copilote_plus" !== "copilote" → needs payment ✓

### 7.2 Guard in Webhook

Only dossiers with `etape_client === "paiement_en_attente"` advance on payment. Why?

- Convoyage invoices exist (quoted, then paid)
- Repair/storage invoices might exist
- Multiple scenarios: each gets an invoice

Without the guard, a convoyage devis being paid would spuriously advance a dossier's étape even if it's not awaiting payment. Guard ensures payment only advances dossiers that expect it.

### 7.3 Email Timing

Two emails would be sent by Stripe webhook:
1. documentCommercialEmail (generic "your invoice is ready")
2. paiementConfirmeEmail (payment received + next stage)

**Solution:** documentCommercialEmail sent at invoice creation (envoyerDocument). paiementConfirmeEmail sent only by webhook when actually paid. No overlap.

### 7.4 Étape History Missing

`updateDossierInfos()` used to update étape without inserting history row. Fixed: now calls `syncStatutAvecEtape()` + inserts row, same as `updateDossierOffre()`.

### 7.5 Idempotent Webhook

Stripe may retry webhook if it doesn't receive 200 OK. Solution:
1. First check: `if (facture.statut === "paye") return;` before updating
2. Even if `enregistrerPaiementOffre` runs twice: second run's guard (`etape_client === "paiement_en_attente"`) fails, exits early

---

## Part 8: Setting Up the Platform

### 8.1 Prerequisites

- Node.js 18+
- PostgreSQL (via Supabase)
- Stripe account (test mode okay initially)
- Resend account (email)
- Vercel account (optional, for deployment)

### 8.2 Quick Start

1. **Clone & install:**
   ```bash
   git clone <repo>
   cd backoffice
   npm install
   ```

2. **Supabase project:**
   - Create account & project at supabase.com
   - Go to SQL Editor, run migrations 0001–0038 in order

3. **Environment variables:**
   ```bash
   cp .env.local.example .env.local
   # Fill in:
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   RESEND_API_KEY=...
   STRIPE_SECRET_KEY=... (sk_test_...)
   STRIPE_WEBHOOK_SECRET=... (whsec_...)
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Create admin user:**
   - Supabase dashboard → Authentication → Add user
   - Use your email + password

5. **Run locally:**
   ```bash
   npm run dev
   # Visit http://localhost:3000/auth/login
   ```

6. **Deploy to Vercel:**
   - Push to GitHub
   - Connect repo to Vercel
   - Add env vars
   - Vercel auto-deploys on push
   - Update Stripe webhook endpoint to `https://your-vercel-url.vercel.app/api/stripe/webhook`

---

## Part 9: Common Tasks

### How do I add a new offer type?

1. Add to `DossierOffre` enum in types.ts
2. Define étapes in ETAPES_OFFRE (etapes.ts)
3. Add to TARIF_OFFRE_DEFAUT (types.ts)
4. Add statut mapping to STATUT_PAR_ETAPE_ACCOMPAGNEMENT (etapes.ts)
5. Test dossier creation, upgrade, payment flow

### How do I change a client's offer?

**Approved ways:**
- Back office → dossiers/[id] → offer pill (triggers `updateDossierOffre`)
- Back office → dossiers/[id] → offer field in form (triggers `updateDossierInfos`)
- Client portal → clicks upgrade button (triggers `upgradeOffreDepuisSuivi`)
- Site form → selects offer (triggers POST /api/public/lead)

**All four call `besoinPaiementOffre` to set the correct first étape.**

### How do I adjust the invoice montant?

On `/dossiers/[id]`, when `etape_client === "paiement_en_attente"`:
1. Look at the montant field (pre-filled)
2. Edit if needed (e.g., complex search → 149€ instead of 99€)
3. Click "Créer et envoyer la facture"
4. Confirm in email preview

No invoice is created twice; each click creates a new facture.

### How do I see payment history?

`/facturation` → filter by type="facture", status="paye" → shows all paid invoices + amounts + dates

For a specific dossier, `/dossiers/[id]` shows linked documents (includes factures).

### How do I test Stripe payments locally?

1. Add Stripe webhook to localhost (ngrok or Stripe CLI):
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Gives you a webhook signing secret for `.env.local`

2. Use test card: `4242 4242 4242 4242`, any future expiry, any CVC

3. Trigger checkout on a dossier → client sees Stripe form → confirm with test card → webhook fires locally → dossier étape updates

---

## Part 10: Database Migrations

All schema changes live in `supabase/migrations/` as SQL files, numbered sequentially:

| Migration | Purpose |
|-----------|---------|
| 0001 | Core tables: dossiers, clients, staff_users, etc. |
| 0009 | Étapes system: per-offer journey stages |
| 0033 | documents_commerciaux table (invoices, contracts) |
| 0037 | Fix: Add 'conge' to agenda_event_type enum |
| 0038 | Payment system: paiement_recu_at, paiement_offre columns |

To apply a migration:
1. Go to Supabase SQL Editor
2. Copy+paste the SQL from migration file
3. Run

---

## Part 11: Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "Impossible d'envoyer : pas d'email" | Client has no email address | Edit client on back office, add email |
| Payment step stuck indefinitely | Webhook didn't fire (Stripe error) | Check Vercel logs; resend from Stripe dashboard |
| Payment step doesn't appear on upgrade | `besoinPaiementOffre` returns false | Check: offer is copilote/copilote_plus AND paiement_offre !== offre |
| Invoice montant is wrong | getMontantDejaPaye not considering old payment | Check documents_commerciaux: prior facture marked "paye"? |
| Calendar shows no "conge" events | Enum value missing | Run migration 0037 |
| Build fails with undefined types | Dossier not importing paiement_recu_at, paiement_offre | Update types.ts & queries.ts to include new columns |

---

## Summary

DIMZ ties together lead intake, internal workflows, and client visibility with integrated payment. The payment step is **stage-based** (étape_client), **conditional** (only Copilote/Plus), **tracked** (paiement_recu_at & paiement_offre), and **webhook-driven** (Stripe → dossier advance).

Key pattern: **Single responsibility functions** (`besoinPaiementOffre`, `etapeApresPaiement`, `resolveEtapesOffre`) ensure consistency across all four offer-change entry points and all email/workflow decisions that depend on payment status.

For questions about any specific module, refer to the relevant section or file paths in Part 3 (Architecture).
