#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Recensement des professionnels de l'automobile de la Métropole de Lyon et du
// Grand Annecy, pour alimenter la rubrique Prospection du back-office.
//
// Lancé à la main depuis l'onglet Actions du dépôt (workflow « Recenser les
// prospects »), jamais automatiquement : c'est un travail de fond qu'on refait
// deux ou trois fois par an, pas un cron.
//
// Deux sources publiques, gratuites et sans clé :
//   - geo.api.gouv.fr            → les communes de chaque agglomération
//   - recherche-entreprises...   → la base SIRENE (raison sociale, SIRET,
//                                  adresse, code NAF, effectif, dirigeants)
// Aucune des deux ne fournit de téléphone ni d'email : ces champs se
// remplissent à la main dans le back-office, au premier contact.
//
// L'écriture passe par la fonction upsert_prospect_sirene (migration 0041),
// qui rafraîchit les données officielles sans jamais écraser ce que l'équipe a
// saisi. Relancer ce script est donc toujours sans risque.
//
// Zéro dépendance npm : fetch est natif depuis Node 18, et le job démarre donc
// sans installation. Extension .mjs car backoffice/package.json n'a pas de
// champ "type" (le projet est en CommonJS par défaut).
// ---------------------------------------------------------------------------

import { appendFileSync } from "node:fs";

// --- Paramètres, fournis par le workflow via l'environnement ---------------

const ZONE_DEMANDEE = process.env.ZONE || "toutes";
const CATEGORIES_DEMANDEES = process.env.CATEGORIES || "defaut";
const SIMULATION = (process.env.SIMULATION || "true").toLowerCase() !== "false";
const LIMITE = Number(process.env.LIMITE || 0) || 0;

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const API_ENTREPRISES = "https://recherche-entreprises.api.gouv.fr/search";
const API_GEO = "https://geo.api.gouv.fr";

// L'API s'annonce à ~7 requêtes/seconde : 200 ms entre deux appels laisse une
// marge confortable sans allonger démesurément un job déjà manuel.
const PAUSE_MS = 200;
const PAR_PAGE = 25; // maximum accepté par l'API
// Une même unité légale peut avoir plusieurs établissements dans le
// département ; sans ce paramètre l'API n'en renvoie qu'une poignée et on
// perdrait les agences des réseaux.
const MAX_ETABLISSEMENTS = 100;
// Au-delà, l'API refuse de paginer plus loin : on re-découpe le flux par code
// postal plutôt que de perdre silencieusement la fin des résultats.
const PLAFOND_API = 10000;

const ZONES = {
  lyon: { code: "lyon", epci: "200046977", nom: "Métropole de Lyon", departement: "69", communesAttendues: 59 },
  annecy: { code: "annecy", epci: "200066793", nom: "Grand Annecy", departement: "74", communesAttendues: 34 },
};

// Recopié de src/lib/types.ts (NAF_CATEGORIE) : un script autonome ne peut pas
// importer du TypeScript. Même duplication assumée que la logique de
// rate-limit.ts, redupliquée dans chaque Edge Function.
const NAF_CATEGORIE = {
  "45.11Z": "concession",
  "45.19Z": "concession",
  "45.20A": "garage",
  "45.20B": "garage",
  "45.31Z": "equipementier",
  "45.32Z": "equipementier",
  "45.40Z": "moto",
  "71.20A": "controle_technique",
  "77.11A": "location",
  "77.11B": "location",
};

// Par défaut on ne recense que les activités qui déplacent réellement des
// véhicules. Le contrôle technique (le client s'y rend lui-même) et les
// équipementiers restent accessibles par le choix « toutes ».
const NAF_DEFAUT = ["45.11Z", "45.19Z", "77.11A", "77.11B", "45.20A", "45.20B", "45.40Z"];

const TRANCHE_EFFECTIF = {
  NN: "Non renseigné",
  "00": "Aucun salarié",
  "01": "1 ou 2 salariés",
  "02": "3 à 5 salariés",
  "03": "6 à 9 salariés",
  11: "10 à 19 salariés",
  12: "20 à 49 salariés",
  21: "50 à 99 salariés",
  22: "100 à 199 salariés",
  31: "200 à 249 salariés",
  32: "250 à 499 salariés",
  41: "500 à 999 salariés",
  42: "1 000 à 1 999 salariés",
  51: "2 000 à 4 999 salariés",
  52: "5 000 à 9 999 salariés",
  53: "10 000 salariés et plus",
};

// --- Utilitaires ------------------------------------------------------------

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const lignesResume = [];
function journal(ligne = "") {
  console.log(ligne);
  lignesResume.push(ligne);
}

function ecrireResume() {
  const fichier = process.env.GITHUB_STEP_SUMMARY;
  if (!fichier) return;
  try {
    appendFileSync(fichier, lignesResume.join("\n") + "\n");
  } catch (err) {
    console.error("Compte-rendu GitHub non écrit :", err?.message ?? err);
  }
}

/**
 * Lyon, Paris et Marseille existent sous deux codes INSEE : celui de la
 * commune dans le référentiel géographique (Lyon = 69123) et ceux des
 * arrondissements dans SIRENE (69381 à 69389). Sans cette équivalence, tous
 * les établissements lyonnais — le cœur de la cible — seraient écartés comme
 * « hors zone », et le job se terminerait en vert avec un trou béant.
 */
const ARRONDISSEMENTS = {
  69123: Array.from({ length: 9 }, (_, i) => String(69381 + i)),
  75056: Array.from({ length: 20 }, (_, i) => String(75101 + i)),
  13055: Array.from({ length: 16 }, (_, i) => String(13201 + i)),
};

function etendreArrondissements(codes) {
  const etendu = new Set(codes);
  for (const [commune, arrondissements] of Object.entries(ARRONDISSEMENTS)) {
    if (etendu.has(commune)) for (const a of arrondissements) etendu.add(a);
    if (arrondissements.some((a) => etendu.has(a))) etendu.add(commune);
  }
  return etendu;
}

/** Normalise un code NAF vers la forme « 45.20A », quelle que soit la source. */
function normaliserNaf(code) {
  if (!code) return null;
  const brut = String(code).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (brut.length < 5) return String(code).toUpperCase();
  return `${brut.slice(0, 2)}.${brut.slice(2, 4)}${brut.slice(4)}`;
}

/**
 * GET JSON avec 3 tentatives. Ne retente que ce qui a une chance d'aboutir
 * (429, 5xx, coupure réseau) : une réponse 400 se retentera à l'identique et
 * échouera pareil, autant remonter l'erreur tout de suite.
 */
async function lireJson(url, tentatives = 3) {
  let derniereErreur = "";
  for (let essai = 1; essai <= tentatives; essai++) {
    if (essai > 1) await dormir(1000 * 4 ** (essai - 2)); // 1 s, puis 4 s
    let res;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    } catch (err) {
      derniereErreur = `réseau : ${err?.message ?? err}`;
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      derniereErreur = `HTTP ${res.status}`;
      continue;
    }
    if (!res.ok) {
      const corps = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} sur ${url}\n${corps.slice(0, 400)}`);
    }
    try {
      return await res.json();
    } catch (err) {
      throw new Error(`Réponse non-JSON sur ${url} : ${err?.message ?? err}`);
    }
  }
  throw new Error(`Échec après ${tentatives} tentatives sur ${url} — ${derniereErreur}`);
}

// --- Étape 1 : quelles communes composent la zone ? -------------------------

/**
 * Résolu à l'exécution plutôt que codé en dur : recopier 93 codes INSEE de
 * mémoire, c'est se tromper quelque part sans jamais s'en apercevoir. Le nom
 * d'EPCI et le nombre de communes sont imprimés pour que l'appariement soit
 * vérifiable d'un coup d'œil dans le compte-rendu du job.
 */
async function resoudreCommunes(zone) {
  const champs = "fields=code,nom,codesPostaux";

  try {
    const communes = await lireJson(`${API_GEO}/epcis/${zone.epci}/communes?${champs}`);
    if (Array.isArray(communes) && communes.length > 0) {
      return { communes, origine: `code EPCI ${zone.epci}` };
    }
  } catch (err) {
    journal(`  ⚠︎ Code EPCI ${zone.epci} inutilisable (${err?.message ?? err}) — recherche par nom.`);
  }

  const candidats = await lireJson(`${API_GEO}/epcis?nom=${encodeURIComponent(zone.nom)}&fields=code,nom`);
  if (!Array.isArray(candidats) || candidats.length === 0) {
    throw new Error(`Aucun EPCI trouvé pour « ${zone.nom} ». Impossible de délimiter la zone.`);
  }
  const choisi = candidats[0];
  const communes = await lireJson(`${API_GEO}/epcis/${choisi.code}/communes?${champs}`);
  if (!Array.isArray(communes) || communes.length === 0) {
    throw new Error(`L'EPCI « ${choisi.nom} » (${choisi.code}) ne renvoie aucune commune.`);
  }
  return { communes, origine: `recherche par nom → « ${choisi.nom} » (${choisi.code})` };
}

// --- Étape 2 : balayage de la base SIRENE -----------------------------------

function construireUrl({ departement, naf, page, codePostal }) {
  const params = new URLSearchParams({
    activite_principale: naf,
    etat_administratif: "A",
    per_page: String(PAR_PAGE),
    page: String(page),
    limite_matching_etablissements: String(MAX_ETABLISSEMENTS),
  });
  if (codePostal) params.set("code_postal", codePostal);
  else params.set("departement", departement);
  return `${API_ENTREPRISES}?${params.toString()}`;
}

/** Première personne physique parmi les dirigeants de l'unité légale. */
function extraireDirigeant(entreprise) {
  const dirigeants = Array.isArray(entreprise?.dirigeants) ? entreprise.dirigeants : [];
  for (const d of dirigeants) {
    const type = String(d?.type_dirigeant ?? "").toLowerCase();
    if (type.includes("morale")) continue;
    const nom = [d?.prenoms, d?.nom].filter(Boolean).join(" ").trim();
    if (nom) return nom;
  }
  return null;
}

function construireProspect(entreprise, etablissement, zone) {
  const naf = normaliserNaf(etablissement?.activite_principale || entreprise?.activite_principale);
  const enseignes = Array.isArray(etablissement?.liste_enseignes) ? etablissement.liste_enseignes : [];
  const trancheCode = entreprise?.tranche_effectif_salarie;

  const prospect = {
    raison_sociale:
      entreprise?.nom_complet || entreprise?.nom_raison_sociale || enseignes[0] || "Établissement sans nom",
    enseigne: enseignes[0] ?? null,
    siret: etablissement?.siret ?? null,
    siren: entreprise?.siren ?? null,
    code_naf: naf,
    categorie: (naf && NAF_CATEGORIE[naf]) || "autre",
    tranche_effectif: trancheCode ? TRANCHE_EFFECTIF[trancheCode] ?? String(trancheCode) : null,
    adresse: etablissement?.adresse ?? null,
    code_postal: etablissement?.code_postal ?? null,
    ville: etablissement?.libelle_commune ?? null,
    code_commune: etablissement?.commune ?? null,
    zone: zone.code,
  };

  // Le téléphone, l'email et le site web ne sont volontairement pas envoyés :
  // SIRENE ne les fournit pas, et la fonction d'upsert les préserverait de
  // toute façon s'ils avaient déjà été saisis à la main.
  const dirigeant = extraireDirigeant(entreprise);
  if (dirigeant) prospect.responsable_nom = dirigeant;

  return prospect;
}

/**
 * Parcourt un flux (un code NAF sur un département, ou sur un code postal
 * quand le flux est trop gros) et renvoie les établissements situés dans la
 * zone. Les compteurs sont mis à jour au passage.
 */
async function parcourirFlux({ zone, naf, communes, codePostal, compteurs, retenus, echantillon }) {
  const codesCommunes = etendreArrondissements(communes.map((c) => c.code));
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    if (LIMITE > 0 && retenus.size >= LIMITE) return;

    const url = construireUrl({ departement: zone.departement, naf, page, codePostal });
    const data = await lireJson(url);
    compteurs.requetes++;

    if (!Array.isArray(data?.results)) {
      throw new Error(
        `Réponse inattendue de l'API entreprises : pas de tableau « results ».\n` +
          `Clés reçues : ${Object.keys(data ?? {}).join(", ") || "(aucune)"}\n` +
          `URL : ${url}`
      );
    }

    if (page === 1) {
      totalPages = Number(data.total_pages) || 1;
      const total = Number(data.total_results) || 0;

      // Flux trop gros pour la pagination de l'API : on le rejoue commune par
      // commune via les codes postaux de la zone, qui sont bien plus étroits.
      if (!codePostal && total >= PLAFOND_API) {
        journal(`  ⚠︎ ${naf} : ${total} résultats, au-delà du plafond de l'API — re-découpage par code postal.`);
        const codesPostaux = [...new Set(communes.flatMap((c) => c.codesPostaux ?? []))];
        for (const cp of codesPostaux) {
          await dormir(PAUSE_MS);
          await parcourirFlux({ zone, naf, communes, codePostal: cp, compteurs, retenus, echantillon });
        }
        return;
      }
    }

    for (const entreprise of data.results) {
      if (echantillon.length === 0) echantillon.push(entreprise);

      const etablissements = Array.isArray(entreprise?.matching_etablissements)
        ? entreprise.matching_etablissements
        : entreprise?.siege
          ? [entreprise.siege]
          : [];

      for (const etab of etablissements) {
        compteurs.vus++;
        if (!etab?.siret) {
          compteurs.sansSiret++;
          continue;
        }
        // Le filtre etat_administratif=A de l'API porte sur l'unité légale, pas
        // sur chacun de ses établissements : une société bien vivante peut
        // traîner des établissements fermés depuis des années. Sans ce test on
        // démarcherait des garages qui n'existent plus.
        if (etab.etat_administratif && etab.etat_administratif !== "A") {
          compteurs.fermes++;
          continue;
        }
        // L'établissement porte son EPCI : c'est le signal le plus direct
        // d'appartenance à l'agglomération. La liste de communes reste en
        // second recours, au cas où le champ manque.
        const dansZone = etab.epci === zone.epci || codesCommunes.has(etab.commune);
        if (!dansZone) {
          compteurs.horsZone++;
          continue;
        }
        if (retenus.has(etab.siret)) continue;
        if (LIMITE > 0 && retenus.size >= LIMITE) return;
        retenus.set(etab.siret, construireProspect(entreprise, etab, zone));
      }
    }

    page++;
    if (page <= totalPages) await dormir(PAUSE_MS);
  }
}

// --- Étape 3 : écriture dans Supabase ---------------------------------------

function entetesSupabase() {
  return {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    "Content-Type": "application/json",
  };
}

async function compterProspects() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/prospects?select=id`, {
      headers: { ...entetesSupabase(), Prefer: "count=exact", Range: "0-0" },
      signal: AbortSignal.timeout(20000),
    });
    const total = Number((res.headers.get("content-range") || "").split("/")[1]);
    return Number.isFinite(total) ? total : null;
  } catch {
    return null;
  }
}

async function upserterProspect(prospect) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_prospect_sirene`, {
    method: "POST",
    headers: entetesSupabase(),
    body: JSON.stringify({ p: prospect }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const corps = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${corps.slice(0, 300)}`);
  }
}

// --- Programme principal ----------------------------------------------------

function choisirNafs() {
  if (CATEGORIES_DEMANDEES === "defaut") return NAF_DEFAUT;
  if (CATEGORIES_DEMANDEES === "toutes") return Object.keys(NAF_CATEGORIE);
  const nafs = Object.keys(NAF_CATEGORIE).filter((naf) => NAF_CATEGORIE[naf] === CATEGORIES_DEMANDEES);
  if (nafs.length === 0) {
    throw new Error(
      `Catégorie inconnue : « ${CATEGORIES_DEMANDEES} ». Valeurs possibles : defaut, toutes, ` +
        [...new Set(Object.values(NAF_CATEGORIE))].join(", ")
    );
  }
  return nafs;
}

function choisirZones() {
  if (ZONE_DEMANDEE === "toutes") return [ZONES.lyon, ZONES.annecy];
  const zone = ZONES[ZONE_DEMANDEE];
  if (!zone) throw new Error(`Zone inconnue : « ${ZONE_DEMANDEE} ». Valeurs possibles : lyon, annecy, toutes.`);
  return [zone];
}

async function main() {
  const zones = choisirZones();
  const nafs = choisirNafs();

  journal("## Recensement des prospects");
  journal("");
  journal(`- **Mode** : ${SIMULATION ? "simulation (aucune écriture)" : "import réel"}`);
  journal(`- **Zones** : ${zones.map((z) => z.nom).join(", ")}`);
  journal(`- **Activités** : ${nafs.join(", ")}`);
  if (LIMITE > 0) journal(`- **Plafond** : ${LIMITE} établissements`);
  journal("");

  if (!SIMULATION) {
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL manquante : impossible d'écrire. Vérifie le workflow.");
    if (!SERVICE_ROLE) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY manquante : ajoute-la dans Settings → Secrets and variables → Actions."
      );
    }
  }

  const compteurs = { requetes: 0, vus: 0, horsZone: 0, fermes: 0, sansSiret: 0, ecrits: 0, erreurs: 0 };
  const retenus = new Map();
  const echantillon = [];

  for (const zone of zones) {
    journal(`### ${zone.nom}`);
    const { communes, origine } = await resoudreCommunes(zone);
    journal(
      `- ${communes.length} communes résolues (${origine})` +
        (communes.length === zone.communesAttendues ? " ✓" : ` — ⚠︎ ${zone.communesAttendues} attendues, à vérifier`)
    );

    const avant = retenus.size;
    for (const naf of nafs) {
      if (LIMITE > 0 && retenus.size >= LIMITE) break;
      await parcourirFlux({ zone, naf, communes, compteurs, retenus, echantillon });
      await dormir(PAUSE_MS);
    }
    journal(`- ${retenus.size - avant} établissements retenus dans la zone`);
    journal("");
  }

  journal("### Résultat");
  journal("");
  journal(`- Requêtes API : ${compteurs.requetes}`);
  journal(`- Établissements examinés : ${compteurs.vus}`);
  journal(`- Écartés hors zone : ${compteurs.horsZone}`);
  journal(`- Écartés car établissement fermé : ${compteurs.fermes}`);
  if (compteurs.sansSiret > 0) journal(`- Écartés sans SIRET : ${compteurs.sansSiret}`);
  journal(`- **Retenus : ${retenus.size}**`);
  journal("");

  if (SIMULATION) {
    const parCategorie = {};
    for (const p of retenus.values()) parCategorie[p.categorie] = (parCategorie[p.categorie] ?? 0) + 1;
    journal("Répartition par catégorie :");
    for (const [categorie, nb] of Object.entries(parCategorie).sort((a, b) => b[1] - a[1])) {
      journal(`- ${categorie} : ${nb}`);
    }
    journal("");

    const exemples = [...retenus.values()].slice(0, 3);
    if (exemples.length > 0) {
      journal("Exemples de fiches telles qu'elles seraient enregistrées :");
      journal("");
      journal("```json");
      journal(JSON.stringify(exemples, null, 2));
      journal("```");
      journal("");
    }

    // Le vrai enjeu du premier passage : voir la forme brute de la réponse,
    // pour confirmer que les champs lus existent bien sous ces noms-là.
    if (echantillon.length > 0) {
      journal("<details><summary>Enregistrement brut de l'API (contrôle du contrat)</summary>");
      journal("");
      journal("```json");
      journal(JSON.stringify(echantillon[0], null, 2).slice(0, 1800));
      journal("```");
      journal("");
      journal("</details>");
      journal("");
    }

    journal("_Simulation : rien n'a été écrit. Relance avec `simulation: false` pour importer._");
    ecrireResume();
    return;
  }

  const totalAvant = await compterProspects();
  let traites = 0;
  for (const prospect of retenus.values()) {
    try {
      await upserterProspect(prospect);
      compteurs.ecrits++;
    } catch (err) {
      compteurs.erreurs++;
      if (compteurs.erreurs <= 5) {
        console.error(`Échec sur ${prospect.siret} (${prospect.raison_sociale}) : ${err?.message ?? err}`);
      }
    }
    traites++;
    if (traites % 200 === 0) console.log(`  … ${traites}/${retenus.size}`);
  }

  const totalApres = await compterProspects();
  journal(`- Fiches envoyées : ${compteurs.ecrits}`);
  if (compteurs.erreurs > 0) journal(`- **Échecs : ${compteurs.erreurs}** (détail dans les logs du job)`);
  if (totalAvant !== null && totalApres !== null) {
    journal(`- Table prospects : ${totalAvant} → ${totalApres} lignes (${totalApres - totalAvant} créées)`);
  }
  journal("");
  journal("_Les fiches déjà présentes ont été rafraîchies sans perdre leur statut, leurs notes ni leurs coordonnées saisies à la main._");

  ecrireResume();
  if (compteurs.erreurs > 0) process.exitCode = 1;
}

main().catch((err) => {
  journal("");
  journal(`### ❌ Échec`);
  journal("");
  journal("```");
  journal(String(err?.message ?? err));
  journal("```");
  ecrireResume();
  process.exitCode = 1;
});
