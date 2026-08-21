import { notFound } from "next/navigation";
import Image from "next/image";
import { Check, AlertCircle } from "lucide-react";
import { getConvoyage, getConvoyageEtatLieux } from "@/lib/queries";
import { getSignedUrls } from "@/lib/storage";
import { Card, PageHeader, LinkButton, Button, Field, inputClass, Badge } from "@/components/ui";
import { SignaturePad } from "@/components/SignaturePad";
import { FuelGauge } from "@/components/FuelGauge";
import { CompressedImageInput } from "@/components/CompressedImageInput";
import { ETAT_LIEUX_PHOTO_SLOTS, ETAT_LIEUX_TYPE_LABELS } from "@/lib/etat-lieux";
import { formatDateTime } from "@/lib/format";
import { saveEtatLieux, confirmerEtatLieux, deletePhotoAutre } from "../actions";

export default async function EtatLieuxPage({
  params,
  searchParams,
}: {
  params: { id: string; convoyageId: string; type: string };
  searchParams: { error?: string };
}) {
  if (params.type !== "depart" && params.type !== "arrivee") notFound();
  const type = params.type;

  const convoyage = await getConvoyage(params.convoyageId);
  if (!convoyage || convoyage.dossier_id !== params.id) notFound();

  const etatLieux = await getConvoyageEtatLieux(params.convoyageId, type);
  const departEtatLieux =
    type === "arrivee" ? await getConvoyageEtatLieux(params.convoyageId, "depart") : null;

  const photoPaths = etatLieux ? Object.values(etatLieux.photos) : [];
  const autresPaths = etatLieux?.photos_autres ?? [];
  const urls = await getSignedUrls([...photoPaths, ...autresPaths]);

  const isConfirmed = !!etatLieux?.confirme_at;
  const missingSlots = ETAT_LIEUX_PHOTO_SLOTS.filter((slot) => !etatLieux?.photos?.[slot.key]);
  const canConfirm = !!etatLieux && missingSlots.length === 0 && !isConfirmed;

  const saveAction = saveEtatLieux.bind(null, params.id, params.convoyageId, type);
  const confirmAction = confirmerEtatLieux.bind(null, params.id, params.convoyageId, type);

  if (type === "arrivee" && !departEtatLieux?.confirme_at) {
    return (
      <div className="max-w-2xl">
        <PageHeader title="État des lieux — Arrivée" />
        <Card className="p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warn shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-ink font-medium">L'état des lieux de départ n'est pas encore confirmé.</p>
            <p className="text-sm text-ink-soft mt-1">
              Complétez et signez d'abord l'état des lieux de départ avant de commencer celui de l'arrivée.
            </p>
            <LinkButton
              href={`/dossiers/${params.id}/convoyages/${params.convoyageId}/etat-lieux/depart`}
              variant="outline"
              className="mt-4"
            >
              Aller à l'état des lieux de départ
            </LinkButton>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`État des lieux — ${ETAT_LIEUX_TYPE_LABELS[type]}`}
        description={`${convoyage.dossiers?.reference} — ${convoyage.adresse_depart || "?"} → ${convoyage.adresse_arrivee || "?"}`}
        actions={isConfirmed ? <Badge tone="good">Confirmé le {formatDateTime(etatLieux!.confirme_at!)}</Badge> : null}
      />

      {searchParams.error ? (
        <div className="mb-4 text-sm text-bad bg-bad-bg border border-bad/20 rounded-md px-3 py-2">
          {searchParams.error}
        </div>
      ) : null}

      <Card className="p-5 mb-4">
        {isConfirmed ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-ink-soft">Kilométrage</p>
              <p className="text-ink font-medium tnum">{etatLieux!.kilometrage ?? "—"} km</p>
            </div>
            <div>
              <p className="text-xs text-ink-soft">Carburant</p>
              <p className="text-ink font-medium tnum">
                {etatLieux!.carburant_pourcentage != null ? `${etatLieux!.carburant_pourcentage} %` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-soft">Contact présent</p>
              <p className="text-ink font-medium">{etatLieux!.contact_nom ?? "—"}</p>
            </div>
          </div>
        ) : (
          <form action={saveAction} className="space-y-4" encType="multipart/form-data">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Kilométrage">
                <input name="kilometrage" type="number" min="0" defaultValue={etatLieux?.kilometrage ?? ""} className={inputClass} />
              </Field>
              <Field label="Contact présent">
                <input name="contact_nom" defaultValue={etatLieux?.contact_nom ?? ""} className={inputClass} />
              </Field>
            </div>

            <FuelGauge name="carburant_pourcentage" defaultValue={etatLieux?.carburant_pourcentage ?? 50} />

            <div>
              <p className="text-xs font-medium text-ink-soft mb-2">
                Photos obligatoires ({ETAT_LIEUX_PHOTO_SLOTS.length - missingSlots.length}/{ETAT_LIEUX_PHOTO_SLOTS.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ETAT_LIEUX_PHOTO_SLOTS.map((slot) => {
                  const path = etatLieux?.photos?.[slot.key];
                  const url = path ? urls[path] : null;
                  return (
                    <label key={slot.key} className="block cursor-pointer">
                      <div className="aspect-square rounded-md border border-line bg-surface-sunken overflow-hidden relative flex items-center justify-center">
                        {url ? (
                          <Image src={url} alt={slot.label} fill className="object-cover" unoptimized />
                        ) : (
                          <span className="text-[10px] text-ink-faint px-2 text-center">Aucune photo</span>
                        )}
                        {url ? (
                          <span className="absolute top-1 right-1 bg-good text-white rounded-full p-0.5">
                            <Check className="h-3 w-3" />
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-ink-soft mt-1 text-center truncate">{slot.label}</p>
                      <CompressedImageInput name={`photo_${slot.key}`} capture="environment" className="hidden" />
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-ink-faint mt-2">
                Cliquez sur un emplacement pour prendre ou choisir la photo. Enregistrez, puis recommencez pour les
                emplacements restants si besoin — les photos déjà ajoutées sont conservées.
              </p>
            </div>

            <Field label="Ajouter des photos facultatives">
              <CompressedImageInput name="photos_autres" multiple className={inputClass} />
            </Field>

            <Button type="submit">Enregistrer</Button>
          </form>
        )}
      </Card>

      {!isConfirmed && autresPaths.length > 0 ? (
        <Card className="p-5 mb-4">
          <h2 className="text-sm font-semibold text-ink mb-3">Photos facultatives ajoutées</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {autresPaths.map((path) =>
              urls[path] ? (
                <div key={path} className="relative aspect-square rounded-md overflow-hidden border border-line">
                  <Image src={urls[path]} alt="" fill className="object-cover" unoptimized />
                  <form action={deletePhotoAutre.bind(null, params.id, params.convoyageId, type, path)} className="absolute top-1 right-1">
                    <button
                      type="submit"
                      className="bg-surface/90 text-bad rounded-full p-1 text-xs leading-none"
                      aria-label="Retirer cette photo"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              ) : null
            )}
          </div>
        </Card>
      ) : null}

      {!isConfirmed ? (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink mb-1">Signature et confirmation</h2>
          {missingSlots.length > 0 ? (
            <p className="text-sm text-warn bg-warn-bg rounded-md px-3 py-2 mb-3">
              Il manque {missingSlots.length} photo{missingSlots.length > 1 ? "s" : ""} obligatoire
              {missingSlots.length > 1 ? "s" : ""} avant de pouvoir confirmer : {missingSlots.map((s) => s.label).join(", ")}.
            </p>
          ) : (
            <p className="text-sm text-ink-soft mb-3">
              Toutes les photos obligatoires sont réunies. Faites signer la personne présente pour confirmer cet état
              des lieux — cette action est définitive.
            </p>
          )}
          <form action={confirmAction}>
            <SignaturePad name="signature" />
            <Button type="submit" className="mt-3" disabled={!canConfirm}>
              Signer et confirmer l'état des lieux
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
