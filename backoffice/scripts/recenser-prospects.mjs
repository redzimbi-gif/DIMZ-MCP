#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Recensement des professionnels de l'automobile du Grand Annecy et du canton
// de Genève, pour alimenter la rubrique Prospection du back-office.
//
// Lancé à la main depuis l'onglet Actions du dépôt (workflow « Recenser les
// prospects »), jamais automatiquement : c'est un travail de fond qu'on refait
// deux ou trois fois par an, pas un cron.
//
// Deux pays, donc deux registres officiels — aucun des deux ne couvre l'autre,
// et c'est la raison pour laquelle ce script a deux chemins de balayage :
//
//   France (Grand Annecy)
//     - geo.api.gouv.fr            → les communes de l'agglomération
//     - recherche-entreprises...   → la base SIRENE (raison sociale, SIRET,
//                                    adresse, code NAF, effectif, dirigeants)
//
//   Suisse (canton de Genève)
//     - vector.sitg.ge.ch          → le Répertoire des entreprises du canton
//                                    (REG), publié en open data par le SITG :
//                                    raison sociale, IDE, adresse, code NOGA.
//
// Le REG ne contient que des entités genevoises : le périmètre « canton de
// Genève uniquement » est garanti par la source elle-même, sans filtrage
// géographique de notre part — contrairement à SIRENE, qui s'interroge par
// département et demande de retrancher ce qui dépasse de l'agglomération.
//
// Aucune des sources ne fournit de téléphone ni d'email : ces champs se
// remplissent à la main dans le back-office, au premier contact.
//
// L'écriture passe par upsert_prospect_sirene / upsert_prospect_reg (migrations
// 0041 et 0042), qui rafraîchissent les données officielles sans jamais
// écraser ce que l'équipe a saisi. Relancer ce script est donc sans risque.
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

// Le SITG a déplacé ses services vecteurs en 2024 : les anciennes URL
// ge.ch/sitgags* ont laissé place à vector.sitg.ge.ch, avec ou sans segment
// « Hosted » selon la couche. On essaie les deux plutôt que de parier.
const SERVICES_REG = [
  "https://vector.sitg.ge.ch/arcgis/rest/services/REG_ENTREPRISE_ETABLISSEMENT/FeatureServer",
  "https://vector.sitg.ge.ch/arcgis/rest/services/Hosted/REG_ENTREPRISE_ETABLISSEMENT/FeatureServer",
];

// L'API s'annonce à ~7 requêtes/seconde, mais ce plafond est une limite de
// pointe, pas un régime soutenable : à 5 req/s un recensement d'agglomération
// se fait couper par un 429 au bout d'une trentaine de pages. 500 ms tient la
// distance, et un job manuel lancé deux fois par an peut se permettre d'être
// lent.
const PAUSE_MS = 500;
const PAR_PAGE = 25; // maximum accepté par l'API entreprises
// Une même unité légale peut avoir plusieurs établissements dans le
// département ; sans ce paramètre l'API n'en renvoie qu'une poignée et on
// perdrait les agences des réseaux.
const MAX_ETABLISSEMENTS = 100;
// Au-delà, l'API refuse de paginer plus loin : on re-découpe le flux par code
// postal plutôt que de perdre silencieusement la fin des résultats.
const PLAFOND_API = 10000;

const ZONES = {
  annecy: {
    code: "annecy",
    registre: "sirene",
    nom: "Grand Annecy",
    epci: "200066793",
    departement: "74",
  },
  geneve: {
    code: "geneve",
    registre: "reg",
    nom: "Canton de Genève",
  },
};

// On ne compare pas à un nombre de communes écrit en dur : le référentiel
// officiel fait foi, et une valeur recopiée de mémoire finit par crier au loup
// (ou par se taire après une fusion de communes). En revanche, un EPCI mal
// apparié ne renvoie qu'une poignée de communes — ce plancher-là, lui, attrape
// la vraie panne.
const COMMUNES_MINIMUM = 10;

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

// NOGA 2008 (Suisse) et NAF rév. 2 (France) descendent tous deux de la
// nomenclature européenne NACE Rév. 2 et sont identiques sur quatre chiffres :
// 4511 est « commerce de voitures » des deux côtés de la frontière. Le REG
// publie un code sur six positions (451101…), d'où une correspondance par
// préfixe plutôt que par égalité.
const NOGA_CATEGORIE = {
  4511: "concession",
  4519: "concession",
  4520: "garage",
  4531: "equipementier",
  4532: "equipementier",
  4540: "moto",
  7120: "controle_technique",
  7711: "location",
};

// Par défaut on ne recense que les activités qui déplacent réellement des
// véhicules. Le contrôle technique (le client s'y rend lui-même, et il est de
// toute façon cantonal à Genève) et les équipementiers restent accessibles par
// le choix « toutes ».
const CATEGORIES_DEFAUT = ["concession", "garage", "location", "moto"];

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

/** Normalise un code NAF vers la forme « 45.20A », quelle que soit la source. */
function normaliserNaf(code) {
  if (!code) return null;
  const brut = String(code).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (brut.length < 5) return String(code).toUpperCase();
  return `${brut.slice(0, 2)}.${brut.slice(2, 4)}${brut.slice(4)}`;
}

/** Ne garde que les chiffres d'un code NOGA : « 45.11.01 » → « 451101 ». */
function normaliserNoga(code) {
  if (code === null || code === undefined) return null;
  const brut = String(code).replace(/\D/g, "");
  return brut.length > 0 ? brut : null;
}

/** Catégorie DIMZ d'un code NOGA, par ses quatre premiers chiffres. */
function categorieNoga(code) {
  const brut = normaliserNoga(code);
  if (!brut || brut.length < 4) return null;
  return NOGA_CATEGORIE[Number(brut.slice(0, 4))] ?? null;
}

// Attentes entre deux tentatives. Un 429 n'est pas un incident passager mais
// un quota : l'API demande explicitement de lever le pied, et la seule réponse
// utile est d'attendre franchement plus longtemps que pour une erreur réseau.
const ATTENTES_RESEAU = [1000, 4000, 16000, 32000];
const ATTENTES_QUOTA = [15000, 45000, 90000, 120000];

/**
 * GET JSON avec plusieurs tentatives. Ne retente que ce qui a une chance
 * d'aboutir (429, 5xx, coupure réseau) : une réponse 400 se retentera à
 * l'identique et échouera pareil, autant remonter l'erreur tout de suite.
 */
async function lireJson(url, tentatives = 5) {
  let derniereErreur = "";
  for (let essai = 1; essai <= tentatives; essai++) {
    let res;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    } catch (err) {
      derniereErreur = `réseau : ${err?.message ?? err}`;
      await dormir(ATTENTES_RESEAU[essai - 1] ?? 32000);
      continue;
    }
    if (res.status === 429) {
      // On respecte Retry-After quand l'API le fournit, sinon on applique
      // notre propre palier, qui s'allonge à chaque tentative.
      const entete = Number(res.headers.get("retry-after"));
      const attente =
        Number.isFinite(entete) && entete > 0 ? entete * 1000 : ATTENTES_QUOTA[essai - 1] ?? 120000;
      derniereErreur = "HTTP 429 (quota de l'API atteint)";
      console.log(`  ⏳ Quota atteint, pause de ${Math.round(attente / 1000)} s…`);
      await dormir(attente);
      continue;
    }
    if (res.status >= 500) {
      derniereErreur = `HTTP ${res.status}`;
      await dormir(ATTENTES_RESEAU[essai - 1] ?? 32000);
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

/**
 * ArcGIS répond « 200 OK » avec un objet { error } dans le corps : sans ce
 * test, une requête refusée passerait pour un résultat vide et le job se
 * terminerait en vert sur une zone tronquée.
 */
async function lireArcgis(url) {
  const data = await lireJson(url);
  if (data?.error) {
    const err = data.error;
    throw new Error(
      `ArcGIS a refusé la requête (code ${err.code ?? "?"}) : ${err.message ?? "sans message"}` +
        (Array.isArray(err.details) && err.details.length > 0 ? `\n${err.details.join("\n")}` : "") +
        `\nURL : ${url}`
    );
  }
  return data;
}

// --- France : quelles communes composent la zone ? --------------------------

/**
 * Résolu à l'exécution plutôt que codé en dur : recopier des dizaines de codes
 * INSEE de mémoire, c'est se tromper quelque part sans jamais s'en apercevoir.
 * Le nom d'EPCI et le nombre de communes sont imprimés pour que l'appariement
 * soit vérifiable d'un coup d'œil dans le compte-rendu du job.
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

// --- France : balayage de la base SIRENE ------------------------------------

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

  // L'effectif de l'établissement, pas celui de l'entreprise : une agence de
  // trois personnes dans un groupe de 400 reste une agence de trois personnes,
  // et c'est elle qu'on appelle. « NN » (non renseigné) vaut absence, d'où le
  // repli sur l'effectif de l'entreprise, qui reste un ordre de grandeur utile.
  const trancheEtablissement = etablissement?.tranche_effectif_salarie;
  const trancheCode =
    trancheEtablissement && trancheEtablissement !== "NN"
      ? trancheEtablissement
      : entreprise?.tranche_effectif_salarie;

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
  const codesCommunes = new Set(communes.map((c) => c.code));
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

async function recenserSirene({ zone, categories, compteurs, retenus, echantillon }) {
  const nafs = Object.keys(NAF_CATEGORIE).filter((naf) => categories.has(NAF_CATEGORIE[naf]));
  if (nafs.length === 0) {
    journal(`- Aucun code NAF pour les activités demandées : zone ignorée.`);
    return;
  }
  journal(`- Codes NAF interrogés : ${nafs.join(", ")}`);

  const { communes, origine } = await resoudreCommunes(zone);
  if (communes.length < COMMUNES_MINIMUM) {
    throw new Error(
      `Seulement ${communes.length} communes trouvées pour « ${zone.nom} » (${origine}). ` +
        `L'EPCI est probablement mal apparié : on s'arrête plutôt que de recenser une zone tronquée.`
    );
  }
  journal(`- ${communes.length} communes résolues (${origine})`);

  for (const naf of nafs) {
    if (LIMITE > 0 && retenus.size >= LIMITE) break;
    await parcourirFlux({ zone, naf, communes, compteurs, retenus, echantillon });
    await dormir(PAUSE_MS);
  }
}

// --- Suisse : le Répertoire des entreprises du canton de Genève -------------

/**
 * Le REG est une couche ArcGIS, donc auto-descriptive : plutôt que de coder en
 * dur un identifiant de couche et des noms de champs qui bougeront au prochain
 * remaniement du SITG, on lit les métadonnées et on apparie les champs par
 * motif. Le compte-rendu imprime ce qui a été reconnu, pour que l'appariement
 * soit vérifiable comme l'est celui de l'EPCI côté français.
 */
const MOTIFS_CHAMPS = {
  noga: [/^CODE_NOGA$/i, /NOGA.*CODE/i, /NOGA/i],
  branche: [/^BRANCHE$/i, /NOGA.*(LIB|TEXT|DESC)/i],
  // La raison sociale du parent est le nom légal complet (« … Sàrl »), le plus
  // utile au téléphone ; NOM est l'enseigne, souvent la même chaîne en plus
  // court. On prend donc le parent d'abord, l'enseigne en second recours.
  raisonSociale: [/^RAISON_SOC_PARENT$/i, /^RAISON_SOCIALE$/i, /DENOMINATION/i, /^NOM$/i],
  enseigne: [/ENSEIGNE/i, /NOM_COMMERCIAL/i, /^NOM$/i],
  ide: [/^NUM_IDE$/i, /^IDE$/i, /IDE$/i, /^UID$/i],
  statut: [/^STATUT_REG$/i, /^STATUT/i],
  type: [/^TYPE_REG$/i, /^TYPE$/i],
  // Le REG publie l'adresse déjà recomposée (« Rue du Pré 19 ») en plus de la
  // rue et du numéro séparés : on préfère la version complète, et le
  // recollage ne sert que si elle manque — sinon le numéro sortirait deux fois.
  adresseComplete: [/^ADRESSE$/i],
  rue: [/^PHYS_RUE$/i, /^RUE$/i, /^NOM_RUE$/i],
  numero: [/^PHYS_NUMRUE$/i, /^NO_RUE$/i, /NUM.*RUE/i],
  codePostal: [/^PHYS_NPA$/i, /NPA/i, /CODE_POSTAL/i],
  commune: [/^PHYS_COMMUNE$/i, /^COMMUNE$/i, /^PHYS_LOCALITE$/i, /^LOCALITE/i, /COMMUNE/i],
  codeCommune: [/NO_COMMUNE/i, /^OFS/i, /COMMUNE.*(NO|CODE)/i],
  adresseId: [/^IDPADR$/i, /^EGID$/i, /ID_ADRESSE/i],
  refEtablissement: [/^ID_ETABLISSEMENT$/i, /^ID_REG$/i, /^NO_REG$/i],
  refEntreprise: [/^ID_ENTREPRISE$/i],
  effectif: [/^TAILLE$/i, /EMPLOI/i, /EFFECTIF/i, /SALARIE/i],
  // Le REG publie les coordonnées de contact, là où SIRENE n'en donne aucune :
  // c'est ce qui rend le recensement genevois directement exploitable.
  telephone: [/^TEL_PRINCIPAL$/i, /^TELEPHONE$/i, /^TEL$/i],
  email: [/^EMAIL$/i, /^COURRIEL$/i],
  siteWeb: [/^SITE_INTERNET$/i, /^SITE_WEB$/i, /^WEB$/i],
};

function apparierChamps(champs) {
  const noms = champs.map((c) => c?.name).filter(Boolean);
  const apparies = {};
  for (const [role, motifs] of Object.entries(MOTIFS_CHAMPS)) {
    for (const motif of motifs) {
      const trouve = noms.find((nom) => motif.test(nom));
      if (trouve) {
        apparies[role] = trouve;
        break;
      }
    }
  }
  return apparies;
}

/** Ouvre le service REG, choisit la couche et apparie ses champs. */
async function resoudreCoucheReg() {
  const echecs = [];

  for (const service of SERVICES_REG) {
    let description;
    try {
      description = await lireArcgis(`${service}?f=json`);
    } catch (err) {
      echecs.push(`${service} — ${err?.message ?? err}`);
      continue;
    }

    const couches = [...(description?.layers ?? []), ...(description?.tables ?? [])];
    if (couches.length === 0) {
      echecs.push(`${service} — service sans couche`);
      continue;
    }

    // S'il y a plusieurs couches, celle qui porte « ETABLISSEMENT » dans son
    // nom est la bonne : c'est l'établissement qu'on démarche, pas le siège.
    const choisie =
      couches.find((c) => /ETABLISSEMENT/i.test(String(c?.name ?? ""))) ?? couches[0];
    const urlCouche = `${service}/${choisie.id}`;

    const meta = await lireArcgis(`${urlCouche}?f=json`);
    const champs = Array.isArray(meta?.fields) ? meta.fields : [];
    if (champs.length === 0) {
      echecs.push(`${urlCouche} — couche sans champ déclaré`);
      continue;
    }

    const apparies = apparierChamps(champs);
    if (!apparies.noga) {
      echecs.push(
        `${urlCouche} — aucun champ de code NOGA reconnu parmi : ${champs.map((c) => c.name).join(", ").slice(0, 300)}`
      );
      continue;
    }

    return {
      url: urlCouche,
      nomCouche: choisie.name ?? String(choisie.id),
      champs,
      apparies,
      champIdentifiant: meta?.objectIdField || "OBJECTID",
      maxParPage: Number(meta?.maxRecordCount) || 1000,
      paginationSupportee: meta?.advancedQueryCapabilities?.supportsPagination !== false,
      typeNoga: champs.find((c) => c.name === apparies.noga)?.type ?? "",
    };
  }

  throw new Error(
    `Répertoire des entreprises genevois (REG) injoignable ou méconnaissable.\n` + echecs.join("\n")
  );
}

/**
 * Clause « where » sur les codes NOGA demandés. Le champ est tantôt textuel,
 * tantôt numérique selon la publication : on compare donc par intervalle
 * numérique quand c'est un nombre, et par préfixe quand c'est du texte. Dans
 * les deux cas le filtrage définitif est refait côté client, si bien qu'une
 * clause trop large reste sans conséquence sur le résultat.
 */
function clauseNoga(prefixes, champ, typeChamp) {
  const numerique = /Integer|Double|Single|SmallInteger/i.test(String(typeChamp));
  const morceaux = prefixes.map((prefixe) =>
    numerique
      ? `(${champ} >= ${prefixe * 100} AND ${champ} < ${(prefixe + 1) * 100})`
      : `${champ} LIKE '${prefixe}%'`
  );
  return morceaux.join(" OR ");
}

function construireProspectReg(attributs, couche, zone, estEtablissement) {
  const c = couche.apparies;
  const valeur = (role) => {
    if (!c[role]) return null;
    const v = attributs[c[role]];
    if (v === null || v === undefined) return null;
    const texte = String(v).trim();
    return texte === "" || texte.toLowerCase() === "null" ? null : texte;
  };

  const noga = normaliserNoga(valeur("noga"));
  const raisonSociale = valeur("raisonSociale");
  const enseigne = valeur("enseigne");

  // L'adresse recomposée par le REG quand elle existe ; sinon, recollage de la
  // rue et du numéro.
  const adresse =
    valeur("adresseComplete") ||
    [valeur("rue"), valeur("numero")].filter(Boolean).join(" ").trim() ||
    null;

  const prospect = {
    raison_sociale: raisonSociale || enseigne || "Établissement sans nom",
    // On ne répète pas le nom légal en enseigne quand les deux coïncident.
    enseigne: enseigne && enseigne !== raisonSociale ? enseigne : null,
    ide: valeur("ide"),
    ref_reg: refReg(attributs, couche, estEtablissement),
    code_naf: noga,
    categorie: categorieNoga(noga) ?? "autre",
    tranche_effectif: valeur("effectif"),
    adresse,
    code_postal: valeur("codePostal"),
    ville: valeur("commune"),
    code_commune: valeur("codeCommune"),
    zone: zone.code,
  };

  // Contrairement à SIRENE, le REG publie téléphone, email et site : on les
  // transmet, et upsert_prospect_reg ne comblera que les champs encore vides,
  // sans jamais écraser ce que l'équipe a corrigé à la main.
  const telephone = valeur("telephone");
  const email = valeur("email");
  const siteWeb = valeur("siteWeb");
  if (telephone) prospect.telephone = telephone;
  if (email) prospect.email = email;
  if (siteWeb) prospect.site_web = siteWeb;

  return prospect;
}

/**
 * Clé de dédoublonnage d'une ligne du REG, stable d'un import à l'autre —
 * contrairement à l'OBJECTID ArcGIS, réattribué à chaque republication de la
 * couche. Les deux natures de ligne ont leur espace de clés, préfixé, afin
 * qu'un établissement et une entreprise ne puissent jamais se confondre.
 */
function refReg(attributs, couche, estEtablissement) {
  const c = couche.apparies;
  const brut = (role) => {
    if (!c[role]) return null;
    const v = attributs[c[role]];
    if (v === null || v === undefined) return null;
    const texte = String(v).trim();
    return texte === "" ? null : texte;
  };

  const entreprise = brut("refEntreprise");
  if (!estEtablissement) return entreprise ? `reg:ent:${entreprise}` : null;

  const propre = brut("refEtablissement");
  if (propre) return `reg:${propre}`;

  // Replis, par ordre de stabilité décroissante, pour le cas où le REG
  // cesserait de publier ID_ETABLISSEMENT.
  const ide = brut("ide");
  const adresseId = brut("adresseId");
  if (ide && adresseId) return `reg:${ide}:${adresseId}`;
  if (entreprise && adresseId) return `reg:${entreprise}:${adresseId}`;
  if (ide) return `reg:${ide}`;
  return null;
}

async function recenserReg({ zone, categories, compteurs, retenus, echantillon, diagnostic }) {
  const prefixes = Object.keys(NOGA_CATEGORIE)
    .map(Number)
    .filter((prefixe) => categories.has(NOGA_CATEGORIE[prefixe]));
  if (prefixes.length === 0) {
    journal(`- Aucun code NOGA pour les activités demandées : zone ignorée.`);
    return;
  }

  const couche = await resoudreCoucheReg();
  diagnostic.reg = couche;
  journal(`- Couche REG : \`${couche.nomCouche}\` (${couche.champs.length} champs)`);
  journal(`- Champs reconnus : ${Object.entries(couche.apparies).map(([r, n]) => `${r}→${n}`).join(", ")}`);
  const manquants = Object.keys(MOTIFS_CHAMPS).filter((role) => !couche.apparies[role]);
  if (manquants.length > 0) journal(`- Champs non reconnus (laissés vides) : ${manquants.join(", ")}`);
  journal(`- Codes NOGA interrogés : ${prefixes.join(", ")}`);

  const where = clauseNoga(prefixes, couche.apparies.noga, couche.typeNoga);
  const parPage = Math.min(couche.maxParPage, 1000);
  // Lignes d'entreprise mises de côté : retenues seulement si aucun de leurs
  // établissements ne les représente (voir le commentaire dans la boucle).
  const candidatsEntreprise = new Map();
  let offset = 0;
  let encore = true;

  while (encore) {
    if (LIMITE > 0 && retenus.size >= LIMITE) return;

    const params = new URLSearchParams({
      where,
      outFields: "*",
      returnGeometry: "false",
      f: "json",
      resultOffset: String(offset),
      resultRecordCount: String(parPage),
      // Sans tri explicite, ArcGIS ne garantit pas l'ordre entre deux pages et
      // la pagination peut sauter ou répéter des lignes.
      orderByFields: couche.champIdentifiant,
    });

    const data = await lireArcgis(`${couche.url}/query?${params.toString()}`);
    compteurs.requetes++;

    const lignes = Array.isArray(data?.features) ? data.features : null;
    if (lignes === null) {
      throw new Error(
        `Réponse inattendue du REG : pas de tableau « features ».\n` +
          `Clés reçues : ${Object.keys(data ?? {}).join(", ") || "(aucune)"}`
      );
    }
    if (lignes.length === 0) break;

    for (const ligne of lignes) {
      const attributs = ligne?.attributes ?? {};
      if (echantillon.length === 0) echantillon.push(attributs);
      compteurs.vus++;

      const type = couche.apparies.type ? String(attributs[couche.apparies.type] ?? "") : "";
      diagnostic.typesReg[type || "(vide)"] = (diagnostic.typesReg[type || "(vide)"] ?? 0) + 1;

      // Le REG n'expose en principe que des entités en activité, mais le champ
      // de statut existe : s'il annonce une radiation, on écarte plutôt que de
      // démarcher un garage fermé.
      const statut = couche.apparies.statut ? String(attributs[couche.apparies.statut] ?? "") : "";
      if (/radi|ferm|inact|cess|dissol/i.test(statut)) {
        compteurs.fermes++;
        continue;
      }

      // Le filtre serveur peut être plus large que la cible (intervalle
      // numérique, champ textuel hétérogène) : la catégorie fait foi.
      const categorie = categorieNoga(attributs[couche.apparies.noga]);
      if (!categorie || !categories.has(categorie)) {
        compteurs.horsActivite++;
        continue;
      }

      // Le REG mêle deux natures de lignes : l'entreprise (l'entité juridique)
      // et l'établissement (le site physique). C'est le site qu'on démarche,
      // donc l'établissement primbe ; mais la première simulation a montré que
      // 338 entreprises exerçant une activité visée n'ont aucun établissement
      // rattaché dans la couche. Les écarter perdait autant de prospects
      // réels, alors l'entreprise est retenue en propre quand — et seulement
      // quand — aucun de ses établissements ne la représente déjà.
      //
      // D'où la mise en attente : l'ordre des pages étant celui des OBJECTID,
      // on ne sait pas, en lisant une ligne d'entreprise, si un établissement
      // la couvrira plus loin. La décision se prend donc après le balayage.
      const refEntreprise = couche.apparies.refEntreprise
        ? String(attributs[couche.apparies.refEntreprise] ?? "").trim()
        : "";
      const estEtablissement = type === "" || /etablissement/i.test(type);
      const prospect = construireProspectReg(attributs, couche, zone, estEtablissement);
      if (!prospect.ref_reg) {
        compteurs.sansReference++;
        continue;
      }

      if (!estEtablissement) {
        if (refEntreprise) diagnostic.entreprisesVues.add(refEntreprise);
        if (!candidatsEntreprise.has(prospect.ref_reg)) {
          candidatsEntreprise.set(prospect.ref_reg, { prospect, refEntreprise });
        }
        continue;
      }

      if (refEntreprise) diagnostic.entreprisesAvecSite.add(refEntreprise);
      if (retenus.has(prospect.ref_reg)) continue;
      if (LIMITE > 0 && retenus.size >= LIMITE) return;
      retenus.set(prospect.ref_reg, prospect);
    }

    // exceededTransferLimit dit qu'il reste des lignes ; une page incomplète
    // dit l'inverse. On croise les deux pour ne pas boucler indéfiniment sur
    // un service qui omettrait le drapeau.
    encore = data.exceededTransferLimit === true || lignes.length === parPage;
    offset += lignes.length;
    if (encore) await dormir(PAUSE_MS);
  }

  // Le balayage est fini : on sait maintenant quelles entreprises ont un
  // établissement. Les autres entrent comme prospects à part entière — leur
  // adresse et leurs coordonnées sont celles du siège, c'est ce numéro qu'on
  // appellerait de toute façon.
  for (const { prospect, refEntreprise } of candidatsEntreprise.values()) {
    if (refEntreprise && diagnostic.entreprisesAvecSite.has(refEntreprise)) {
      compteurs.entreprisesCouvertes++;
      continue;
    }
    if (retenus.has(prospect.ref_reg)) continue;
    if (LIMITE > 0 && retenus.size >= LIMITE) return;
    retenus.set(prospect.ref_reg, prospect);
    compteurs.entreprisesSansSite++;
  }
}

// --- Écriture dans Supabase -------------------------------------------------

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

/** Chaque registre a sa fonction d'upsert, car la clé de conflit diffère. */
function fonctionUpsert(prospect) {
  return prospect.ref_reg ? "upsert_prospect_reg" : "upsert_prospect_sirene";
}

async function upserterProspect(prospect) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fonctionUpsert(prospect)}`, {
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

/**
 * L'entrée « categories » du workflow désigne une activité DIMZ, pas un code
 * officiel : c'est ce qui permet au même choix de valoir pour SIRENE (codes
 * NAF) et pour le REG (codes NOGA), chaque registre traduisant ensuite dans sa
 * propre nomenclature.
 */
function choisirCategories() {
  const connues = new Set([...Object.values(NAF_CATEGORIE), ...Object.values(NOGA_CATEGORIE)]);
  if (CATEGORIES_DEMANDEES === "defaut") return new Set(CATEGORIES_DEFAUT);
  if (CATEGORIES_DEMANDEES === "toutes") return connues;
  if (!connues.has(CATEGORIES_DEMANDEES)) {
    throw new Error(
      `Catégorie inconnue : « ${CATEGORIES_DEMANDEES} ». Valeurs possibles : defaut, toutes, ` +
        [...connues].join(", ")
    );
  }
  return new Set([CATEGORIES_DEMANDEES]);
}

function choisirZones() {
  if (ZONE_DEMANDEE === "toutes") return [ZONES.geneve, ZONES.annecy];
  const zone = ZONES[ZONE_DEMANDEE];
  if (!zone) {
    throw new Error(
      `Zone inconnue : « ${ZONE_DEMANDEE} ». Valeurs possibles : ${Object.keys(ZONES).join(", ")}, toutes.`
    );
  }
  return [zone];
}

async function main() {
  const zones = choisirZones();
  const categories = choisirCategories();

  journal("## Recensement des prospects");
  journal("");
  journal(`- **Mode** : ${SIMULATION ? "simulation (aucune écriture)" : "import réel"}`);
  journal(`- **Zones** : ${zones.map((z) => z.nom).join(", ")}`);
  journal(`- **Activités** : ${[...categories].join(", ")}`);
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

  const compteurs = {
    requetes: 0,
    vus: 0,
    horsZone: 0,
    horsActivite: 0,
    fermes: 0,
    entreprisesCouvertes: 0,
    entreprisesSansSite: 0,
    sansSiret: 0,
    sansReference: 0,
    ecrits: 0,
    erreurs: 0,
  };
  const retenus = new Map();
  const diagnostic = {
    reg: null,
    typesReg: {},
    // Identifiants d'entreprise rencontrés, selon qu'un établissement les
    // porte ou non : sert à prouver que ne garder que les établissements ne
    // fait perdre aucune entreprise visée.
    entreprisesVues: new Set(),
    entreprisesAvecSite: new Set(),
  };

  for (const zone of zones) {
    journal(`### ${zone.nom}`);
    const echantillon = [];
    const avant = retenus.size;

    if (zone.registre === "sirene") {
      await recenserSirene({ zone, categories, compteurs, retenus, echantillon });
    } else {
      await recenserReg({ zone, categories, compteurs, retenus, echantillon, diagnostic });
    }

    journal(`- ${retenus.size - avant} établissements retenus dans la zone`);
    journal("");
    if (SIMULATION && echantillon.length > 0) diagnostic[`echantillon_${zone.code}`] = echantillon[0];
  }

  journal("### Résultat");
  journal("");
  journal(`- Requêtes API : ${compteurs.requetes}`);
  journal(`- Établissements examinés : ${compteurs.vus}`);
  if (compteurs.horsZone > 0) journal(`- Écartés hors zone : ${compteurs.horsZone}`);
  if (compteurs.horsActivite > 0) journal(`- Écartés hors activité visée : ${compteurs.horsActivite}`);
  journal(`- Écartés car établissement fermé : ${compteurs.fermes}`);
  if (compteurs.entreprisesCouvertes > 0) {
    journal(
      `- Lignes d'entreprise écartées, un établissement les représentant : ${compteurs.entreprisesCouvertes}`
    );
  }
  if (compteurs.entreprisesSansSite > 0) {
    journal(
      `- Entreprises retenues faute d'établissement rattaché : ${compteurs.entreprisesSansSite} ` +
        `(fiches au siège)`
    );
  }
  if (compteurs.sansSiret > 0) journal(`- Écartés sans SIRET : ${compteurs.sansSiret}`);
  if (compteurs.sansReference > 0) journal(`- Écartés sans identifiant exploitable : ${compteurs.sansReference}`);

  // Contrôle : toute entreprise visée doit être représentée, soit par un de
  // ses établissements, soit par sa propre fiche. Un reste non nul voudrait
  // dire qu'on en a perdu, et c'est le genre de trou qui passe inaperçu si on
  // ne le compte pas.
  const perdues = [...diagnostic.entreprisesVues].filter(
    (e) => !diagnostic.entreprisesAvecSite.has(e)
  ).length;
  if (perdues !== compteurs.entreprisesSansSite) {
    journal(
      `- ⚠︎ **${perdues - compteurs.entreprisesSansSite} entreprise(s) visée(s) ni couverte(s) par un ` +
        `établissement ni retenue(s) en propre** : à élucider avant l'import réel.`
    );
  }
  journal(`- **Retenus : ${retenus.size}**`);
  journal("");

  if (SIMULATION) {
    const parCategorie = {};
    const parZone = {};
    for (const p of retenus.values()) {
      parCategorie[p.categorie] = (parCategorie[p.categorie] ?? 0) + 1;
      parZone[p.zone] = (parZone[p.zone] ?? 0) + 1;
    }
    journal("Répartition par zone :");
    for (const [zone, nb] of Object.entries(parZone).sort((a, b) => b[1] - a[1])) {
      journal(`- ${zone} : ${nb}`);
    }
    const avecTel = [...retenus.values()].filter((p) => p.telephone).length;
    const avecEmail = [...retenus.values()].filter((p) => p.email).length;
    const avecSite = [...retenus.values()].filter((p) => p.site_web).length;
    if (avecTel + avecEmail + avecSite > 0) {
      journal(
        `Coordonnées fournies par le registre : ${avecTel} téléphone(s), ` +
          `${avecEmail} email(s), ${avecSite} site(s) web.`
      );
      journal("");
    }
    journal("Répartition par catégorie :");
    for (const [categorie, nb] of Object.entries(parCategorie).sort((a, b) => b[1] - a[1])) {
      journal(`- ${categorie} : ${nb}`);
    }
    journal("");

    // Le REG distingue entreprise et établissement : voir la répartition dit
    // s'il faudra filtrer sur ce champ avant l'import réel.
    const types = Object.entries(diagnostic.typesReg);
    if (types.length > 0) {
      journal("Répartition par type REG :");
      for (const [type, nb] of types.sort((a, b) => b[1] - a[1])) {
        journal(`- ${type || "(vide)"} : ${nb}`);
      }
      journal("");
    }

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
    for (const zone of zones) {
      const brut = diagnostic[`echantillon_${zone.code}`];
      if (!brut) continue;
      journal(`<details><summary>Enregistrement brut — ${zone.nom} (contrôle du contrat)</summary>`);
      journal("");
      journal("```json");
      journal(JSON.stringify(brut, null, 2).slice(0, 1800));
      journal("```");
      journal("");
      journal("</details>");
      journal("");
    }

    if (diagnostic.reg) {
      journal("<details><summary>Champs publiés par le REG</summary>");
      journal("");
      journal("```");
      journal(diagnostic.reg.champs.map((c) => `${c.name} (${c.type})`).join("\n"));
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
        const cle = prospect.siret ?? prospect.ref_reg;
        console.error(`Échec sur ${cle} (${prospect.raison_sociale}) : ${err?.message ?? err}`);
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
