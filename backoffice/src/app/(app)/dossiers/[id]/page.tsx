import { notFound } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { Plus, Star, ExternalLink, Trash2, Mail, PenLine, FileDown, Archive, ArchiveRestore, Download } from "lucide-react";
import {
  getDossier,
  getDossierHistory,
  getDossierEtapeHistory,
  getDossierAnnonces,
  getFicheDecouverteVehicules,
  getDossierInspections,
  getDossierConvoyages,
  getDossierDocuments,
  getDossierContrats,
  getDossierNotes,
} from "@/lib/queries";
import {
  Card,
  PageHeader,
  StatutBadge,
  EmptyState,
  Field,
  inputClass,
  Button,
  LinkButton,
  Badge,
} from "@/components/ui";
import { EmailStatusBanner } from "@/components/EmailStatusBanner";
import { DossierTabs } from "@/components/DossierTabs";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { AutoResetForm } from "@/components/AutoResetForm";
import {
  DOSSIER_STATUTS,
  DOSSIER_STATUT_LABELS,
  DOSSIER_OFFRES,
  DOSSIER_OFFRE_LABELS,
  DOCUMENT_TYPE_LABELS,
  FICHE_DECOUVERTE_ENERGIES,
  CONTRAT_TYPES,
  CONTRAT_TYPE_LABELS,
  CONTRAT_STATUT_LABELS,
  type DossierOffre,
} from "@/lib/types";
import { CONTRAT_CHAMPS } from "@/lib/contrats";
import { getSignedUrls } from "@/lib/storage";
import { getEtapesOffre, getOffreAccompagnement, getEtapeLabel, ETAPES_CONVOYAGE } from "@/lib/etapes";
import { formatCurrency, formatDate, formatDateTime, formatRelative } from "@/lib/format";
import {
  updateDossierInfos,
  updateDossierStatut,
  addDossierNote,
  updateDossierOffre,
  updateDossierEtapeClient,
  sendEtapeClientEmail,
  decideConvoyageDemande,
  archiveDossier,
  unarchiveDossier,
  deleteDossier,
} from "../actions";
import { createAnnonce, toggleAnnonceSelection, deleteAnnonce } from "./annonces-actions";
import { updateMarketCommentaire, sendMarketEmail } from "./market-actions";
import {
  addFicheDecouverteVehicule,
  deleteFicheDecouverteVehicule,
  sendFicheDecouverteEmail,
  updateFicheDecouverteIntro,
} from "./decouverte-actions";
import { uploadDossierDocument, archiverDocument, reactiverDocument, supprimerDocument } from "./documents-actions";
import { generateContrat, marquerContratSigne, archiverContrat, reactiverContrat } from "./contrats-actions";

const OFFRES_ACCOMPAGNEMENT = ["decouverte", "copilote", "copilote_plus", "expertise_seule"] as const;

const DONNEES_BRUTES_KEYS_MASQUEES = new Set(["Formulaire", "Horodatage"]);

// Regroupe les réponses brutes du formulaire ("Section — Champ" : valeur)
// par section, pour un affichage clair au lieu du bloc de texte brut
// autrefois entassé dans "Commentaires".
function groupDonneesBrutes(data: Record<string, unknown> | null) {
  if (!data) return [];
  const groups = new Map<string, { label: string; value: string }[]>();
  for (const [key, rawValue] of Object.entries(data)) {
    if (DONNEES_BRUTES_KEYS_MASQUEES.has(key)) continue;
    if (typeof rawValue !== "string" || !rawValue.trim()) continue;
    const separatorIndex = key.indexOf(" — ");
    const section = separatorIndex === -1 ? "Autres informations" : key.slice(0, separatorIndex);
    const label = separatorIndex === -1 ? key : key.slice(separatorIndex + 3);
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section)!.push({ label, value: rawValue });
  }
  return Array.from(groups.entries());
}

export default async function DossierDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string; notif?: string; error?: string; archives?: string };
}) {
  const dossier = await getDossier(params.id);
  if (!dossier) notFound();

  const tab = searchParams.tab || "infos";
  const history = await getDossierHistory(dossier.id);
  const etapeHistory = await getDossierEtapeHistory(dossier.id);

  const updateInfosAction = updateDossierInfos.bind(null, dossier.id);
  const updateStatutAction = updateDossierStatut.bind(null, dossier.id);
  const addNoteAction = addDossierNote.bind(null, dossier.id);
  const createAnnonceAction = createAnnonce.bind(null, dossier.id);
  const marketCommentaireAction = updateMarketCommentaire.bind(null, dossier.id);
  const sendMarketAction = sendMarketEmail.bind(null, dossier.id);
  const uploadDocAction = uploadDossierDocument.bind(null, dossier.id);
  const updateEtapeAction = updateDossierEtapeClient.bind(null, dossier.id);
  const sendEtapeEmailAction = sendEtapeClientEmail.bind(null, dossier.id, tab);
  const archiveAction = archiveDossier.bind(null, dossier.id);
  const unarchiveAction = unarchiveDossier.bind(null, dossier.id);
  const deleteAction = deleteDossier.bind(null, dossier.id);

  const portalUrl = `/suivi/${dossier.portal_token}`;
  const donneesGroups = groupDonneesBrutes(dossier.donnees_brutes);

  const isConvoyage = dossier.offre === "convoyage_seul";
  const offreAccompagnement = getOffreAccompagnement(dossier.offre);
  const etapesSuiviClient = isConvoyage ? ETAPES_CONVOYAGE : getEtapesOffre(dossier.offre);
  const peutEnvoyerEmailEtape = dossier.etape_client !== "demande_recue";

  return (
    <div>
      <PageHeader
        title={dossier.reference}
        description={
          <>
            <Link href={`/clients/${dossier.client_id}`} className="text-blue-600 hover:underline">
              {dossier.clients?.prenom} {dossier.clients?.nom}
            </Link>
            {" · "}Créé le {formatDate(dossier.created_at)}
          </>
        }
        actions={
          <>
            <StatutBadge statut={dossier.statut} />
            {dossier.archive ? <Badge tone="neutral">Archivé</Badge> : null}
            <LinkButton href={portalUrl} variant="outline">
              <ExternalLink className="h-4 w-4" /> Suivi client
            </LinkButton>
            {dossier.archive ? (
              <form action={unarchiveAction}>
                <Button type="submit" variant="outline">
                  <ArchiveRestore className="h-4 w-4" /> Désarchiver
                </Button>
              </form>
            ) : (
              <form action={archiveAction}>
                <Button type="submit" variant="outline">
                  <Archive className="h-4 w-4" /> Archiver
                </Button>
              </form>
            )}
            <form action={deleteAction}>
              <ConfirmSubmitButton
                variant="danger"
                confirmMessage={`Supprimer définitivement le dossier ${dossier.reference} ? Cette action est irréversible et supprimera aussi ses annonces, inspections, convoyages, documents et notes.`}
              >
                <Trash2 className="h-4 w-4" /> Supprimer
              </ConfirmSubmitButton>
            </form>
          </>
        }
      />

      <EmailStatusBanner status={searchParams.notif} />

      {searchParams.error ? (
        <div className="mb-4 text-sm text-bad bg-bad-bg border border-bad/20 rounded-md px-3 py-2">
          {searchParams.error}
        </div>
      ) : null}

      <Card className="p-4 mb-4">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
          Suivi client — ce que voit le client sur son espace de suivi
        </p>

        {isConvoyage ? (
          <>
            {dossier.convoyage_decision === "en_attente" ? (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs text-ink-soft mr-1">Décision sur la demande :</span>
                <form action={decideConvoyageDemande.bind(null, dossier.id, "accepte")}>
                  <Button type="submit">Dossier accepté</Button>
                </form>
                <form action={decideConvoyageDemande.bind(null, dossier.id, "refuse")}>
                  <Button type="submit" variant="danger">
                    Dossier refusé
                  </Button>
                </form>
              </div>
            ) : (
              <div className="mb-4">
                <Badge tone={dossier.convoyage_decision === "accepte" ? "good" : "bad"}>
                  {dossier.convoyage_decision === "accepte" ? "Demande acceptée" : "Demande refusée"}
                </Badge>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-ink-soft mb-2">Offre choisie</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {OFFRES_ACCOMPAGNEMENT.map((o) => (
                <form key={o} action={updateDossierOffre.bind(null, dossier.id, o as DossierOffre)}>
                  <button
                    type="submit"
                    className={clsx(
                      "rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors",
                      offreAccompagnement === o
                        ? "bg-blue-500 text-white border-blue-500"
                        : "border-line text-ink-soft hover:bg-surface-sunken"
                    )}
                  >
                    {DOSSIER_OFFRE_LABELS[o]}
                  </button>
                </form>
              ))}
            </div>
          </>
        )}

        {dossier.etape_client === "demande_refusee" ? null : (
          <form action={updateEtapeAction} className="flex flex-wrap items-end gap-3">
            <Field label="Étape visible par le client">
              <select name="etape_client" defaultValue={dossier.etape_client} className={inputClass}>
                {etapesSuiviClient.map((e) => (
                  <option key={e.key} value={e.key}>
                    {e.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Note (optionnel)">
              <input name="note" className={inputClass} placeholder="Précision sur ce changement…" />
            </Field>
            <Button type="submit">Mettre à jour</Button>
          </form>
        )}

        {peutEnvoyerEmailEtape ? (
          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-line">
            <p className="text-xs text-ink-soft">
              Envoie au client l'email correspondant à l'étape actuelle
              {isConvoyage ? " (ton professionnel)" : " (ton copilote, léger)"}.
            </p>
            <form action={sendEtapeEmailAction} className="shrink-0">
              <Button type="submit" variant="outline">
                <Mail className="h-4 w-4" /> Informer le client
              </Button>
            </form>
          </div>
        ) : null}
      </Card>

      <details className="mb-6">
        <summary className="cursor-pointer text-xs font-semibold text-ink-faint uppercase tracking-wide mb-2">
          Pipeline interne (usage équipe, non visible par le client)
        </summary>
        <Card className="p-4 mt-2">
          <form action={updateStatutAction} className="flex flex-wrap items-end gap-3">
            <Field label="Faire évoluer le statut">
              <select name="statut" defaultValue={dossier.statut} className={inputClass}>
                {DOSSIER_STATUTS.map((s) => (
                  <option key={s} value={s}>
                    {DOSSIER_STATUT_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Note (optionnel)">
              <input name="note" className={inputClass} placeholder="Précision sur ce changement…" />
            </Field>
            <Button type="submit">Mettre à jour</Button>
          </form>
        </Card>
      </details>

      <DossierTabs dossierId={dossier.id} active={tab} />

      {tab === "infos" ? (
        <Card className="p-6 max-w-2xl">
          <form action={updateInfosAction} className="space-y-4">
            <Field label="Offre">
              <select name="offre" defaultValue={dossier.offre ?? ""} className={inputClass}>
                <option value="">—</option>
                {DOSSIER_OFFRES.map((o) => (
                  <option key={o} value={o}>
                    {DOSSIER_OFFRE_LABELS[o]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Budget">
                <input name="budget" defaultValue={dossier.budget ?? ""} className={inputClass} />
              </Field>
              <Field label="Valeur estimée (€)">
                <input
                  name="valeur_estimee"
                  type="number"
                  step="0.01"
                  defaultValue={dossier.valeur_estimee ?? ""}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Véhicule recherché">
              <input
                name="vehicule_recherche"
                defaultValue={dossier.vehicule_recherche ?? ""}
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Marques souhaitées">
                <input
                  name="marques_souhaitees"
                  defaultValue={dossier.marques_souhaitees ?? ""}
                  className={inputClass}
                />
              </Field>
              <Field label="Motorisation">
                <input name="motorisation" defaultValue={dossier.motorisation ?? ""} className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Boîte de vitesses">
                <input name="boite_vitesses" defaultValue={dossier.boite_vitesses ?? ""} className={inputClass} />
              </Field>
              <Field label="Kilométrage maximum">
                <input name="km_max" defaultValue={dossier.km_max ?? ""} className={inputClass} />
              </Field>
            </div>
            <Field label="Région">
              <input name="region" defaultValue={dossier.region ?? ""} className={inputClass} />
            </Field>
            <Field label="Commentaires">
              <textarea
                name="commentaires"
                defaultValue={dossier.commentaires ?? ""}
                rows={4}
                className={inputClass}
              />
            </Field>
            <Button type="submit">Enregistrer</Button>
          </form>
        </Card>
      ) : null}

      {tab === "infos" && donneesGroups.length > 0 ? (
        <Card className="p-6 max-w-2xl mt-4">
          <h2 className="text-sm font-semibold text-ink mb-1">Réponses du formulaire</h2>
          <p className="text-xs text-ink-soft mb-4">
            Tel que rempli par le client, pour référence — champ « Commentaires » ci-dessus pour tes propres notes.
          </p>
          <div className="space-y-5">
            {donneesGroups.map(([section, rows]) => (
              <div key={section}>
                <h3 className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">{section}</h3>
                <dl className="divide-y divide-line border-t border-line">
                  {rows.map((row) => (
                    <div key={row.label} className="flex items-start justify-between gap-4 py-2 text-sm">
                      <dt className="text-ink-soft shrink-0">{row.label}</dt>
                      <dd className="text-ink text-right">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {tab === "vehicules" ? (
        <VehiculesTab
          dossier={dossier}
          createAnnonceAction={createAnnonceAction}
          marketCommentaireAction={marketCommentaireAction}
          sendMarketAction={sendMarketAction}
        />
      ) : null}

      {tab === "decouverte" ? <DecouverteTab dossierId={dossier.id} /> : null}

      {tab === "inspection" ? <InspectionTab dossierId={dossier.id} /> : null}

      {tab === "convoyage" ? <ConvoyageTab dossierId={dossier.id} /> : null}

      {tab === "documents" ? (
        <DocumentsTab
          dossierId={dossier.id}
          uploadDocAction={uploadDocAction}
          showArchives={searchParams.archives === "1"}
        />
      ) : null}

      {tab === "contrats" ? <ContratsTab dossierId={dossier.id} /> : null}

      {tab === "notes" ? (
        <NotesTab
          dossierId={dossier.id}
          addNoteAction={addNoteAction}
          history={history}
          etapeHistory={etapeHistory}
          offre={dossier.offre}
        />
      ) : null}
    </div>
  );
}

async function VehiculesTab({
  dossier,
  createAnnonceAction,
  marketCommentaireAction,
  sendMarketAction,
}: {
  dossier: NonNullable<Awaited<ReturnType<typeof getDossier>>>;
  createAnnonceAction: (formData: FormData) => Promise<void>;
  marketCommentaireAction: (formData: FormData) => Promise<void>;
  sendMarketAction: () => Promise<void>;
}) {
  const annonces = await getDossierAnnonces(dossier.id);
  const isMarketOffre = dossier.offre === "copilote" || dossier.offre === "copilote_plus";
  const selectionneesCount = annonces.filter((a) => a.selectionnee).length;
  const marketTitle = dossier.offre === "copilote_plus" ? "Copilote + Market" : "Copilote Market";
  const toggleAction = async (annonceId: string, next: boolean) => {
    "use server";
    await toggleAnnonceSelection(dossier.id, annonceId, next);
  };
  const removeAction = async (annonceId: string) => {
    "use server";
    await deleteAnnonce(dossier.id, annonceId);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        {isMarketOffre ? (
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div>
                <p className="text-sm font-medium text-ink">{marketTitle}</p>
                <p className="text-xs text-ink-soft mt-0.5">
                  {selectionneesCount} annonce{selectionneesCount > 1 ? "s" : ""} sélectionnée
                  {selectionneesCount > 1 ? "s" : ""} (avec l'étoile ci-contre)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <LinkButton href={`/api/dossiers/${dossier.id}/market/pdf`} variant="outline">
                  <FileDown className="h-4 w-4" /> Voir le PDF
                </LinkButton>
                <form action={sendMarketAction}>
                  <Button type="submit" variant="outline" disabled={selectionneesCount === 0}>
                    <Mail className="h-4 w-4" /> Envoyer au client
                  </Button>
                </form>
              </div>
            </div>
            <form action={marketCommentaireAction} className="space-y-2">
              <Field label="Commentaire libre (affiché après l'intro, avant les annonces)">
                <textarea
                  name="market_commentaire"
                  rows={3}
                  defaultValue={
                    (dossier.offre === "copilote_plus"
                      ? dossier.market_commentaire_copilote_plus
                      : dossier.market_commentaire_copilote) ?? ""
                  }
                  placeholder="Un mot personnalisé sur cette sélection…"
                  className={inputClass}
                />
              </Field>
              <Button type="submit" variant="outline">
                Enregistrer le commentaire
              </Button>
            </form>
          </Card>
        ) : null}

        {annonces.length === 0 ? (
          <Card>
            <EmptyState
              title="Aucune annonce ajoutée"
              description="Ajoute les annonces repérées pour ce dossier depuis le formulaire à droite."
            />
          </Card>
        ) : (
          annonces.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink truncate">{a.titre}</p>
                    {a.selectionnee ? <Badge tone="blue">Sélectionnée</Badge> : null}
                  </div>
                  <p className="text-sm text-ink-soft mt-1">
                    {[a.annee, a.kilometrage ? `${a.kilometrage.toLocaleString("fr-FR")} km` : null, a.localisation]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="text-sm font-medium text-blue-600 mt-1 tnum">
                    {a.prix ? formatCurrency(a.prix) : "Prix non renseigné"}
                    {a.prix_negocie ? ` → ${formatCurrency(a.prix_negocie)} négocié` : ""}
                  </p>
                  {a.score_confiance != null ? (
                    <p className="text-xs font-medium text-blue-600 mt-1 tnum">Score DIMZ : {a.score_confiance}/10</p>
                  ) : null}
                  {a.score_prix != null || a.score_historique != null || a.score_etat != null || a.score_adequation != null ? (
                    <p className="text-xs text-ink-faint mt-0.5 tnum">
                      {[
                        a.score_prix != null ? `Prix ${a.score_prix}` : null,
                        a.score_historique != null ? `Historique ${a.score_historique}` : null,
                        a.score_etat != null ? `État ${a.score_etat}` : null,
                        a.score_adequation != null ? `Adéquation ${a.score_adequation}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                  {a.avis_copilote ? (
                    <p className="text-sm text-ink mt-2 bg-surface-sunken rounded-md p-2">
                      « {a.avis_copilote} »
                    </p>
                  ) : null}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 text-xs">
                    {a.points_forts ? (
                      <p className="text-good">+ {a.points_forts}</p>
                    ) : null}
                    {a.points_faibles ? (
                      <p className="text-bad">− {a.points_faibles}</p>
                    ) : null}
                  </div>
                  {a.lien ? (
                    <a
                      href={a.lien}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
                    >
                      Voir l'annonce <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Link
                    href={`/dossiers/${dossier.id}/annonces/${a.id}/edit`}
                    className="p-1.5 rounded-md text-ink-faint hover:text-blue-600 hover:bg-blue-50"
                    aria-label="Noter cette annonce"
                    title="Noter cette annonce"
                  >
                    <PenLine className="h-4 w-4" />
                  </Link>
                  <form action={toggleAction.bind(null, a.id, !a.selectionnee)}>
                    <button
                      type="submit"
                      className="p-1.5 rounded-md text-ink-faint hover:text-blue-600 hover:bg-blue-50"
                      aria-label="Sélectionner cette annonce"
                    >
                      <Star className={a.selectionnee ? "h-4 w-4 fill-blue-500 text-blue-500" : "h-4 w-4"} />
                    </button>
                  </form>
                  <form action={removeAction.bind(null, a.id)}>
                    <button
                      type="submit"
                      className="p-1.5 rounded-md text-ink-faint hover:text-bad hover:bg-bad-bg"
                      aria-label="Supprimer cette annonce"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="p-5 h-fit">
        <h2 className="text-sm font-semibold text-ink mb-4">Ajouter une annonce</h2>
        <AutoResetForm action={createAnnonceAction} className="space-y-3" encType="multipart/form-data">
          <Field label="Titre">
            <input name="titre" required className={inputClass} />
          </Field>
          <Field label="Lien de l'annonce">
            <input name="lien" type="url" className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Prix (€)">
              <input name="prix" type="number" step="0.01" className={inputClass} />
            </Field>
            <Field label="Kilométrage">
              <input name="kilometrage" type="number" className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Année">
              <input name="annee" type="number" className={inputClass} />
            </Field>
            <Field label="Localisation">
              <input name="localisation" className={inputClass} />
            </Field>
          </div>
          <Field label="Avis du copilote">
            <textarea name="avis_copilote" rows={2} className={inputClass} />
          </Field>
          <Field label="Points forts">
            <input name="points_forts" className={inputClass} />
          </Field>
          <Field label="Points faibles">
            <input name="points_faibles" className={inputClass} />
          </Field>
          <Field label="Score DIMZ global (/10)">
            <input name="score_confiance" type="number" min={0} max={10} step="0.5" className={inputClass} />
          </Field>
          <Field label="Photos">
            <input name="photos" type="file" accept="image/*" multiple className={inputClass} />
          </Field>
          <Button type="submit" className="w-full">
            <Plus className="h-4 w-4" /> Ajouter l'annonce
          </Button>
        </AutoResetForm>
        <p className="text-xs text-ink-faint mt-3">
          Le détail du Score DIMZ (prix, historique, état, adéquation) se complète ensuite via « Noter » sur
          l'annonce.
        </p>
      </Card>
    </div>
  );
}

async function DecouverteTab({ dossierId }: { dossierId: string }) {
  const dossier = await getDossier(dossierId);
  const vehicules = await getFicheDecouverteVehicules(dossierId);
  const addAction = addFicheDecouverteVehicule.bind(null, dossierId);
  const sendAction = sendFicheDecouverteEmail.bind(null, dossierId);
  const introAction = updateFicheDecouverteIntro.bind(null, dossierId);
  const removeAction = async (vehiculeId: string) => {
    "use server";
    await deleteFicheDecouverteVehicule(dossierId, vehiculeId);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <div className="flex justify-end gap-2 mb-1">
          <LinkButton href={`/api/dossiers/${dossierId}/fiche-decouverte/pdf`} variant="outline">
            <FileDown className="h-4 w-4" /> Fiche PDF
          </LinkButton>
          <form action={sendAction}>
            <Button type="submit" variant="outline" disabled={vehicules.length === 0}>
              <Mail className="h-4 w-4" /> Envoyer au client
            </Button>
          </form>
        </div>

        <Card className="p-4">
          <form action={introAction} className="space-y-2">
            <Field label="Commentaire libre (affiché après l'intro, avant les véhicules)">
              <textarea
                name="fiche_decouverte_intro"
                rows={3}
                defaultValue={dossier?.fiche_decouverte_intro ?? ""}
                placeholder="Un mot personnalisé sur ce dossier, en plus de l'intro par défaut…"
                className={inputClass}
              />
            </Field>
            <Button type="submit" variant="outline">
              Enregistrer le commentaire
            </Button>
          </form>
        </Card>

        {vehicules.length === 0 ? (
          <Card>
            <EmptyState title="Aucun véhicule ajouté à la fiche Découverte" />
          </Card>
        ) : (
          vehicules.map((v) => (
            <Card key={v.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink truncate">
                      {[v.marque, v.modele].filter(Boolean).join(" ") || "Véhicule"}
                    </p>
                    {v.energie ? <Badge tone="blue">{v.energie}</Badge> : null}
                  </div>
                  {v.prix_min && v.prix_max ? (
                    <p className="text-sm text-ink-soft mt-1 tnum">
                      Entre {formatCurrency(v.prix_min)} et {formatCurrency(v.prix_max)}
                    </p>
                  ) : v.prix_min || v.prix_max ? (
                    <p className="text-sm text-ink-soft mt-1 tnum">
                      Environ {formatCurrency((v.prix_min ?? v.prix_max)!)}
                    </p>
                  ) : null}
                  {v.point_fort ? <p className="text-sm text-good mt-2">+ {v.point_fort}</p> : null}
                  {v.point_vigilance ? <p className="text-sm text-warn mt-1">! {v.point_vigilance}</p> : null}
                </div>
                <form action={removeAction.bind(null, v.id)}>
                  <button
                    type="submit"
                    className="p-1.5 rounded-md text-ink-faint hover:text-bad hover:bg-bad-bg shrink-0"
                    aria-label="Retirer ce véhicule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="p-5 h-fit">
        <h2 className="text-sm font-semibold text-ink mb-4">Ajouter un véhicule</h2>
        <AutoResetForm action={addAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marque">
              <input name="marque" className={inputClass} />
            </Field>
            <Field label="Modèle">
              <input name="modele" className={inputClass} />
            </Field>
          </div>
          <Field label="Énergie">
            <select name="energie" defaultValue="" className={inputClass}>
              <option value="">—</option>
              {FICHE_DECOUVERTE_ENERGIES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prix min (€)">
              <input name="prix_min" type="number" step="1" min="0" className={inputClass} />
            </Field>
            <Field label="Prix max (€)">
              <input name="prix_max" type="number" step="1" min="0" className={inputClass} />
            </Field>
          </div>
          <Field label="Point fort">
            <input name="point_fort" className={inputClass} />
          </Field>
          <Field label="Point de vigilance">
            <input name="point_vigilance" className={inputClass} />
          </Field>
          <Button type="submit" className="w-full">
            <Plus className="h-4 w-4" /> Ajouter le véhicule
          </Button>
        </AutoResetForm>
        <p className="text-xs text-ink-faint mt-3">
          Pas de score sur cette fiche — c'est un premier aperçu avant une éventuelle offre Copilote.
        </p>
      </Card>
    </div>
  );
}

async function InspectionTab({ dossierId }: { dossierId: string }) {
  const inspections = await getDossierInspections(dossierId);
  return (
    <div>
      <div className="flex justify-end mb-4">
        <LinkButton href={`/dossiers/${dossierId}/inspections/new`}>
          <Plus className="h-4 w-4" /> Nouvelle inspection
        </LinkButton>
      </div>
      {inspections.length === 0 ? (
        <Card>
          <EmptyState title="Aucune inspection réalisée pour ce dossier" />
        </Card>
      ) : (
        <div className="space-y-3">
          {inspections.map((i) => (
            <Link key={i.id} href={`/dossiers/${dossierId}/inspections/${i.id}`}>
              <Card className="p-4 hover:border-blue-300 transition-colors flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">Inspection du {formatDate(i.date_inspection)}</p>
                  <p className="text-sm text-ink-soft mt-0.5">
                    {i.note_finale != null ? `Note finale : ${i.note_finale}/10` : "Note non renseignée"}
                  </p>
                </div>
                <span className="text-xs text-ink-faint">{formatRelative(i.created_at)}</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

async function ConvoyageTab({ dossierId }: { dossierId: string }) {
  const convoyages = await getDossierConvoyages(dossierId);
  return (
    <div>
      <div className="flex justify-end mb-4">
        <LinkButton href={`/dossiers/${dossierId}/convoyages/new`}>
          <Plus className="h-4 w-4" /> Nouveau convoyage
        </LinkButton>
      </div>
      {convoyages.length === 0 ? (
        <Card>
          <EmptyState title="Aucun convoyage planifié pour ce dossier" />
        </Card>
      ) : (
        <div className="space-y-3">
          {convoyages.map((c) => (
            <Link key={c.id} href={`/dossiers/${dossierId}/convoyages/${c.id}`}>
              <Card className="p-4 hover:border-blue-300 transition-colors flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">
                    {c.adresse_depart || "—"} → {c.adresse_arrivee || "—"}
                  </p>
                  <p className="text-sm text-ink-soft mt-0.5">
                    {c.date_convoyage ? formatDate(c.date_convoyage) : "Date à définir"}
                  </p>
                </div>
                <Badge tone={c.statut === "livre" ? "good" : "blue"}>{c.statut}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

async function DocumentsTab({
  dossierId,
  uploadDocAction,
  showArchives,
}: {
  dossierId: string;
  uploadDocAction: (formData: FormData) => Promise<void>;
  showArchives: boolean;
}) {
  const documents = await getDossierDocuments(dossierId, { archived: showArchives });
  const urls = await getSignedUrls(documents.map((d) => d.storage_path));
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <div className="flex items-center justify-end mb-3">
          <LinkButton
            href={showArchives ? `/dossiers/${dossierId}?tab=documents` : `/dossiers/${dossierId}?tab=documents&archives=1`}
            variant="outline"
          >
            <Archive className="h-4 w-4" /> {showArchives ? "Retour aux fichiers actifs" : "Voir les archives"}
          </LinkButton>
        </div>
        <Card>
          {documents.length === 0 ? (
            <EmptyState title={showArchives ? "Aucun document archivé" : "Aucun document pour ce dossier"} />
          ) : (
            <ul className="divide-y divide-line">
              {documents.map((d) => {
                const archiverAction = archiverDocument.bind(null, dossierId, d.id);
                const reactiverAction = reactiverDocument.bind(null, dossierId, d.id);
                const supprimerAction = supprimerDocument.bind(null, dossierId, d.id);
                return (
                  <li key={d.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <span className="text-sm text-ink truncate">{d.nom}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge>{DOCUMENT_TYPE_LABELS[d.type]}</Badge>
                      {urls[d.storage_path] ? (
                        <a
                          href={urls[d.storage_path]}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-md text-ink-soft hover:text-blue-600 hover:bg-blue-50"
                          aria-label="Télécharger"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      ) : null}
                      {showArchives ? (
                        <form action={reactiverAction}>
                          <button
                            type="submit"
                            className="p-1.5 rounded-md text-ink-soft hover:text-blue-600 hover:bg-blue-50"
                            aria-label="Désarchiver"
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </button>
                        </form>
                      ) : (
                        <form action={archiverAction}>
                          <button
                            type="submit"
                            className="p-1.5 rounded-md text-ink-soft hover:text-blue-600 hover:bg-blue-50"
                            aria-label="Archiver"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        </form>
                      )}
                      <form action={supprimerAction}>
                        <ConfirmSubmitButton
                          variant="ghost"
                          className="!p-1.5 text-ink-soft hover:text-bad hover:bg-bad-bg"
                          confirmMessage={`Supprimer définitivement « ${d.nom} » ? Cette action est irréversible.`}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
      <Card className="p-5 h-fit">
        <h2 className="text-sm font-semibold text-ink mb-4">Ajouter un document</h2>
        <AutoResetForm action={uploadDocAction} className="space-y-3" encType="multipart/form-data">
          <Field label="Type">
            <select name="type" className={inputClass}>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fichier">
            <input name="fichier" type="file" required className={inputClass} />
          </Field>
          <Button type="submit" className="w-full">
            Ajouter
          </Button>
        </AutoResetForm>
      </Card>
    </div>
  );
}

const CONTRAT_STATUT_TONE: Record<string, "warn" | "good" | "neutral"> = {
  a_signer: "warn",
  signe: "good",
  archive: "neutral",
};

async function ContratsTab({ dossierId }: { dossierId: string }) {
  const contrats = await getDossierContrats(dossierId);

  return (
    <div className="space-y-3 max-w-2xl">
      {CONTRAT_TYPES.map((type) => {
        const contrat = contrats.find((c) => c.type === type);
        const champsDefs = CONTRAT_CHAMPS[type];
        const generateAction = generateContrat.bind(null, dossierId, type);
        const marquerSigneAction = marquerContratSigne.bind(null, dossierId, type);
        const archiverAction = archiverContrat.bind(null, dossierId, type);
        const reactiverAction = reactiverContrat.bind(null, dossierId, type);

        return (
          <Card key={type} className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium text-ink">{CONTRAT_TYPE_LABELS[type]}</p>
                {contrat ? (
                  <p className="text-xs text-ink-soft mt-0.5">
                    Généré le {formatDate(contrat.date_generation ?? contrat.created_at)}
                    {contrat.date_signature ? ` · Signé le ${formatDate(contrat.date_signature)}` : ""}
                  </p>
                ) : (
                  <p className="text-xs text-ink-faint mt-0.5">Pas encore généré</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={contrat ? CONTRAT_STATUT_TONE[contrat.statut] : "neutral"}>
                  {contrat ? CONTRAT_STATUT_LABELS[contrat.statut] : "—"}
                </Badge>
                {contrat ? (
                  <a
                    href={`/api/dossiers/${dossierId}/contrats/${type}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-blue-600 hover:underline whitespace-nowrap"
                  >
                    Voir le PDF
                  </a>
                ) : null}
              </div>
            </div>

            {contrat ? (
              <div className="flex items-center gap-2 mt-3">
                {contrat.statut === "a_signer" ? (
                  <form action={marquerSigneAction}>
                    <Button type="submit" variant="outline" className="text-xs px-2.5 py-1.5">
                      Marquer signé
                    </Button>
                  </form>
                ) : null}
                {contrat.statut !== "archive" ? (
                  <form action={archiverAction}>
                    <Button type="submit" variant="ghost" className="text-xs px-2.5 py-1.5">
                      Archiver
                    </Button>
                  </form>
                ) : (
                  <form action={reactiverAction}>
                    <Button type="submit" variant="ghost" className="text-xs px-2.5 py-1.5">
                      Désarchiver
                    </Button>
                  </form>
                )}
              </div>
            ) : null}

            <details className="mt-3">
              <summary className="text-xs font-medium text-blue-600 cursor-pointer select-none">
                {contrat ? "Régénérer" : "Générer ce document"}
              </summary>
              <form action={generateAction} className="space-y-3 mt-3">
                {champsDefs.map((def) => (
                  <Field key={def.key} label={def.label}>
                    {def.type === "textarea" ? (
                      <textarea
                        name={def.key}
                        rows={2}
                        defaultValue={contrat?.champs?.[def.key] ?? ""}
                        placeholder={def.placeholder}
                        className={inputClass}
                      />
                    ) : def.type === "select" ? (
                      <select
                        name={def.key}
                        defaultValue={contrat?.champs?.[def.key] ?? ""}
                        className={inputClass}
                      >
                        <option value="">—</option>
                        {def.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        name={def.key}
                        type={def.type}
                        defaultValue={contrat?.champs?.[def.key] ?? ""}
                        placeholder={def.placeholder}
                        className={inputClass}
                      />
                    )}
                  </Field>
                ))}
                <Button type="submit" className="text-xs px-3 py-1.5">
                  {contrat ? "Régénérer" : "Générer"}
                </Button>
              </form>
            </details>
          </Card>
        );
      })}
    </div>
  );
}

async function NotesTab({
  dossierId,
  addNoteAction,
  history,
  etapeHistory,
  offre,
}: {
  dossierId: string;
  addNoteAction: (formData: FormData) => Promise<void>;
  history: Awaited<ReturnType<typeof getDossierHistory>>;
  etapeHistory: Awaited<ReturnType<typeof getDossierEtapeHistory>>;
  offre: DossierOffre | null;
}) {
  const notes = await getDossierNotes(dossierId);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink mb-4">Notes internes</h2>
        <AutoResetForm action={addNoteAction} className="flex gap-2 mb-5">
          <input name="contenu" placeholder="Ajouter une note…" className={inputClass} />
          <Button type="submit" variant="outline" className="shrink-0">
            Ajouter
          </Button>
        </AutoResetForm>
        {notes.length === 0 ? (
          <EmptyState title="Aucune note" />
        ) : (
          <ul className="space-y-4">
            {notes.map((n) => (
              <li key={n.id} className="text-sm border-l-2 border-line pl-3">
                <p className="text-ink">{n.contenu}</p>
                <p className="text-xs text-ink-faint mt-0.5">{formatRelative(n.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink mb-4">Historique du suivi client</h2>
        {etapeHistory.length === 0 ? (
          <EmptyState title="Aucun historique" />
        ) : (
          <ol className="space-y-4">
            {etapeHistory
              .slice()
              .reverse()
              .map((h) => (
                <li key={h.id} className="text-sm flex items-start gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-ink font-medium">{getEtapeLabel(offre, h.etape_client)}</p>
                    {h.note ? <p className="text-ink-soft">{h.note}</p> : null}
                    <p className="text-xs text-ink-faint mt-0.5">{formatDateTime(h.created_at)}</p>
                  </div>
                </li>
              ))}
          </ol>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink mb-4">Historique du pipeline interne</h2>
        {history.length === 0 ? (
          <EmptyState title="Aucun historique" />
        ) : (
          <ol className="space-y-4">
            {history
              .slice()
              .reverse()
              .map((h) => (
                <li key={h.id} className="text-sm flex items-start gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-ink-faint mt-1.5 shrink-0" />
                  <div>
                    <p className="text-ink font-medium">{DOSSIER_STATUT_LABELS[h.statut]}</p>
                    {h.note ? <p className="text-ink-soft">{h.note}</p> : null}
                    <p className="text-xs text-ink-faint mt-0.5">{formatDateTime(h.created_at)}</p>
                  </div>
                </li>
              ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
