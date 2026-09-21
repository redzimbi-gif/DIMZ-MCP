import { notFound } from "next/navigation";
import Link from "next/link";
import { Trash2, Handshake, Phone, Mail, Globe } from "lucide-react";
import { getProspect, getProspectNotes, aujourdhui } from "@/lib/queries";
import {
  Card,
  PageHeader,
  EmptyState,
  Field,
  inputClass,
  Button,
  Badge,
  ProspectStatutBadge,
} from "@/components/ui";
import { AutoResetForm } from "@/components/AutoResetForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import {
  PROSPECT_STATUTS,
  PROSPECT_STATUT_LABELS,
  PROSPECT_CATEGORIES,
  PROSPECT_CATEGORIE_LABELS,
  PROSPECT_ZONES,
  PROSPECT_ZONE_LABELS,
  PROSPECT_SOURCE_LABELS,
} from "@/lib/types";
import {
  updateProspect,
  updateProspectStatut,
  addProspectNote,
  deleteProspect,
  convertirEnClient,
} from "../actions";

export default async function ProspectDetailPage({ params }: { params: { id: string } }) {
  const prospect = await getProspect(params.id);
  if (!prospect) notFound();

  const notes = await getProspectNotes(prospect.id);

  const updateAction = updateProspect.bind(null, prospect.id);
  const statutAction = updateProspectStatut.bind(null, prospect.id);
  const addNoteAction = addProspectNote.bind(null, prospect.id);
  const deleteAction = deleteProspect.bind(null, prospect.id);
  const convertirAction = convertirEnClient.bind(null, prospect.id);

  const relanceDue =
    prospect.prochaine_relance_le && prospect.prochaine_relance_le <= aujourdhui();

  return (
    <div>
      <PageHeader
        title={prospect.raison_sociale}
        description={
          [
            PROSPECT_CATEGORIE_LABELS[prospect.categorie],
            [prospect.code_postal, prospect.ville].filter(Boolean).join(" "),
            `Ajouté le ${formatDateTime(prospect.created_at)}`,
          ]
            .filter(Boolean)
            .join(" · ")
        }
        actions={
          <form action={deleteAction}>
            <ConfirmSubmitButton
              variant="danger"
              confirmMessage={`Supprimer définitivement ${prospect.raison_sociale} ? Cette action est irréversible et supprimera aussi son historique d'échanges.`}
            >
              <Trash2 className="h-4 w-4" /> Supprimer
            </ConfirmSubmitButton>
          </form>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-sm font-semibold text-ink">Suivi commercial</h2>
              <ProspectStatutBadge statut={prospect.statut} />
            </div>

            <form action={statutAction} className="space-y-3">
              <Field label="Statut">
                <select name="statut" defaultValue={prospect.statut} className={inputClass}>
                  {PROSPECT_STATUTS.map((s) => (
                    <option key={s} value={s}>
                      {PROSPECT_STATUT_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Prochaine relance">
                <input
                  type="date"
                  name="prochaine_relance_le"
                  defaultValue={prospect.prochaine_relance_le ?? ""}
                  className={inputClass}
                />
              </Field>
              <Button type="submit" className="w-full">
                Mettre à jour
              </Button>
            </form>

            <dl className="mt-4 pt-4 border-t border-line space-y-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-ink-soft">Dernière relance</dt>
                <dd className="text-ink">
                  {prospect.derniere_relance_le ? formatDate(prospect.derniere_relance_le) : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-soft">Prochaine relance</dt>
                <dd className={relanceDue ? "text-warn font-medium" : "text-ink"}>
                  {prospect.prochaine_relance_le ? formatDate(prospect.prochaine_relance_le) : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-soft">Origine</dt>
                <dd className="text-ink">{PROSPECT_SOURCE_LABELS[prospect.source]}</dd>
              </div>
              {prospect.tranche_effectif ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-soft">Effectif</dt>
                  <dd className="text-ink">{prospect.tranche_effectif}</dd>
                </div>
              ) : null}
              {prospect.siret ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-soft">SIRET</dt>
                  <dd className="text-ink tnum">{prospect.siret}</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink mb-3">Contacter</h2>
            <div className="space-y-2 text-sm">
              {prospect.telephone ? (
                <a
                  href={`tel:${prospect.telephone}`}
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <Phone className="h-4 w-4 shrink-0" /> {prospect.telephone}
                </a>
              ) : (
                <p className="flex items-center gap-2 text-ink-faint">
                  <Phone className="h-4 w-4 shrink-0" /> Aucun téléphone
                </p>
              )}
              {prospect.email ? (
                <a
                  href={`mailto:${prospect.email}`}
                  className="flex items-center gap-2 text-blue-600 hover:underline break-all"
                >
                  <Mail className="h-4 w-4 shrink-0" /> {prospect.email}
                </a>
              ) : (
                <p className="flex items-center gap-2 text-ink-faint">
                  <Mail className="h-4 w-4 shrink-0" /> Aucun email
                </p>
              )}
              {prospect.site_web ? (
                <a
                  href={prospect.site_web.startsWith("http") ? prospect.site_web : `https://${prospect.site_web}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline break-all"
                >
                  <Globe className="h-4 w-4 shrink-0" /> {prospect.site_web}
                </a>
              ) : null}
              {prospect.responsable_nom ? (
                <p className="text-ink-soft pt-1">
                  Interlocuteur : <span className="text-ink">{prospect.responsable_nom}</span>
                  {prospect.responsable_fonction ? ` (${prospect.responsable_fonction})` : ""}
                </p>
              ) : null}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink mb-3">Conversion</h2>
            {prospect.converti_client_id ? (
              <div className="space-y-2">
                <Badge tone="good">Devenu client</Badge>
                <Link
                  href={`/clients/${prospect.converti_client_id}`}
                  className="block text-sm text-blue-600 hover:underline"
                >
                  Ouvrir la fiche client →
                </Link>
              </div>
            ) : (
              <form action={convertirAction}>
                <p className="text-xs text-ink-soft mb-3">
                  Crée une fiche client professionnelle à partir de ce prospect, sans perdre
                  l&apos;historique de prospection.
                </p>
                <ConfirmSubmitButton
                  variant="outline"
                  confirmMessage={`Créer une fiche client pour ${prospect.raison_sociale} ?`}
                  className="w-full"
                >
                  <Handshake className="h-4 w-4" /> Convertir en client
                </ConfirmSubmitButton>
              </form>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-ink mb-4">Fiche de l&apos;établissement</h2>
            <form action={updateAction} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Raison sociale">
                  <input
                    name="raison_sociale"
                    defaultValue={prospect.raison_sociale}
                    required
                    className={inputClass}
                  />
                </Field>
                <Field label="Enseigne">
                  <input name="enseigne" defaultValue={prospect.enseigne ?? ""} className={inputClass} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Catégorie">
                  <select name="categorie" defaultValue={prospect.categorie} className={inputClass}>
                    {PROSPECT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {PROSPECT_CATEGORIE_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Zone">
                  <select name="zone" defaultValue={prospect.zone ?? ""} className={inputClass}>
                    <option value="">—</option>
                    {PROSPECT_ZONES.map((z) => (
                      <option key={z} value={z}>
                        {PROSPECT_ZONE_LABELS[z]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Adresse">
                <input name="adresse" defaultValue={prospect.adresse ?? ""} className={inputClass} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Code postal">
                  <input name="code_postal" defaultValue={prospect.code_postal ?? ""} className={inputClass} />
                </Field>
                <Field label="Ville">
                  <input name="ville" defaultValue={prospect.ville ?? ""} className={inputClass} />
                </Field>
                <Field label="SIRET">
                  <input name="siret" defaultValue={prospect.siret ?? ""} className={inputClass} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Téléphone">
                  <input
                    name="telephone"
                    type="tel"
                    defaultValue={prospect.telephone ?? ""}
                    className={inputClass}
                  />
                </Field>
                <Field label="Email">
                  <input
                    name="email"
                    type="email"
                    defaultValue={prospect.email ?? ""}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Site web">
                <input name="site_web" defaultValue={prospect.site_web ?? ""} className={inputClass} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nom du responsable">
                  <input
                    name="responsable_nom"
                    defaultValue={prospect.responsable_nom ?? ""}
                    className={inputClass}
                  />
                </Field>
                <Field label="Fonction">
                  <input
                    name="responsable_fonction"
                    defaultValue={prospect.responsable_fonction ?? ""}
                    placeholder="Gérant, chef d'atelier…"
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Code NAF">
                <input name="code_naf" defaultValue={prospect.code_naf ?? ""} className={inputClass} />
              </Field>
              <Field label="Notes">
                <textarea
                  name="notes"
                  defaultValue={prospect.notes ?? ""}
                  rows={4}
                  placeholder="Contexte, besoins en convoyage, volumes évoqués…"
                  className={inputClass}
                />
              </Field>
              <Button type="submit" className="w-full">
                Enregistrer
              </Button>
            </form>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink mb-4">Historique des échanges</h2>
            <AutoResetForm action={addNoteAction} className="flex gap-2 mb-5">
              <input
                name="contenu"
                placeholder="Ajouter une note sur un échange (appel, email, RDV…)"
                className={inputClass}
              />
              <Button type="submit" variant="outline" className="shrink-0">
                Ajouter
              </Button>
            </AutoResetForm>
            {notes.length === 0 ? (
              <EmptyState title="Aucun échange enregistré" />
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
        </div>
      </div>
    </div>
  );
}
