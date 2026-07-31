import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Star, ExternalLink, Trash2 } from "lucide-react";
import {
  getDossier,
  getDossierHistory,
  getDossierAnnonces,
  getDossierInspections,
  getDossierConvoyages,
  getDossierDocuments,
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
import { DossierTabs } from "@/components/DossierTabs";
import {
  DOSSIER_STATUTS,
  DOSSIER_STATUT_LABELS,
  DOSSIER_OFFRES,
  DOSSIER_OFFRE_LABELS,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { updateDossierInfos, updateDossierStatut, addDossierNote } from "../actions";
import { createAnnonce, toggleAnnonceSelection, deleteAnnonce } from "./annonces-actions";
import { uploadDossierDocument } from "./documents-actions";

export default async function DossierDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const dossier = await getDossier(params.id);
  if (!dossier) notFound();

  const tab = searchParams.tab || "infos";
  const history = await getDossierHistory(dossier.id);

  const updateInfosAction = updateDossierInfos.bind(null, dossier.id);
  const updateStatutAction = updateDossierStatut.bind(null, dossier.id);
  const addNoteAction = addDossierNote.bind(null, dossier.id);
  const createAnnonceAction = createAnnonce.bind(null, dossier.id);
  const uploadDocAction = uploadDossierDocument.bind(null, dossier.id);

  const portalUrl = `/suivi/${dossier.portal_token}`;

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
            <LinkButton href={portalUrl} variant="outline">
              <ExternalLink className="h-4 w-4" /> Suivi client
            </LinkButton>
          </>
        }
      />

      <Card className="p-4 mb-6">
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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

      {tab === "vehicules" ? <VehiculesTab dossier={dossier} createAnnonceAction={createAnnonceAction} /> : null}

      {tab === "inspection" ? <InspectionTab dossierId={dossier.id} /> : null}

      {tab === "convoyage" ? <ConvoyageTab dossierId={dossier.id} /> : null}

      {tab === "documents" ? (
        <DocumentsTab dossierId={dossier.id} uploadDocAction={uploadDocAction} />
      ) : null}

      {tab === "notes" ? (
        <NotesTab dossierId={dossier.id} addNoteAction={addNoteAction} history={history} />
      ) : null}
    </div>
  );
}

async function VehiculesTab({
  dossier,
  createAnnonceAction,
}: {
  dossier: NonNullable<Awaited<ReturnType<typeof getDossier>>>;
  createAnnonceAction: (formData: FormData) => Promise<void>;
}) {
  const annonces = await getDossierAnnonces(dossier.id);
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
                    <p className="text-xs text-ink-faint mt-1">Score de confiance : {a.score_confiance}/100</p>
                  ) : null}
                  {a.avis_copilote ? (
                    <p className="text-sm text-ink mt-2 bg-surface-sunken rounded-md p-2">
                      « {a.avis_copilote} »
                    </p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
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
        <form action={createAnnonceAction} className="space-y-3" encType="multipart/form-data">
          <Field label="Titre">
            <input name="titre" required className={inputClass} />
          </Field>
          <Field label="Lien de l'annonce">
            <input name="lien" type="url" className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prix (€)">
              <input name="prix" type="number" step="0.01" className={inputClass} />
            </Field>
            <Field label="Kilométrage">
              <input name="kilometrage" type="number" className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          <Field label="Score de confiance (0-100)">
            <input name="score_confiance" type="number" min={0} max={100} className={inputClass} />
          </Field>
          <Field label="Photos">
            <input name="photos" type="file" accept="image/*" multiple className={inputClass} />
          </Field>
          <Button type="submit" className="w-full">
            <Plus className="h-4 w-4" /> Ajouter l'annonce
          </Button>
        </form>
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
}: {
  dossierId: string;
  uploadDocAction: (formData: FormData) => Promise<void>;
}) {
  const documents = await getDossierDocuments(dossierId);
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <Card>
          {documents.length === 0 ? (
            <EmptyState title="Aucun document pour ce dossier" />
          ) : (
            <ul className="divide-y divide-line">
              {documents.map((d) => (
                <li key={d.id} className="px-5 py-3.5 flex items-center justify-between">
                  <span className="text-sm text-ink">{d.nom}</span>
                  <Badge>{DOCUMENT_TYPE_LABELS[d.type]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card className="p-5 h-fit">
        <h2 className="text-sm font-semibold text-ink mb-4">Ajouter un document</h2>
        <form action={uploadDocAction} className="space-y-3" encType="multipart/form-data">
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
        </form>
      </Card>
    </div>
  );
}

async function NotesTab({
  dossierId,
  addNoteAction,
  history,
}: {
  dossierId: string;
  addNoteAction: (formData: FormData) => Promise<void>;
  history: Awaited<ReturnType<typeof getDossierHistory>>;
}) {
  const notes = await getDossierNotes(dossierId);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink mb-4">Notes internes</h2>
        <form action={addNoteAction} className="flex gap-2 mb-5">
          <input name="contenu" placeholder="Ajouter une note…" className={inputClass} />
          <Button type="submit" variant="outline" className="shrink-0">
            Ajouter
          </Button>
        </form>
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
        <h2 className="text-sm font-semibold text-ink mb-4">Historique des statuts</h2>
        {history.length === 0 ? (
          <EmptyState title="Aucun historique" />
        ) : (
          <ol className="space-y-4">
            {history
              .slice()
              .reverse()
              .map((h) => (
                <li key={h.id} className="text-sm flex items-start gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
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
