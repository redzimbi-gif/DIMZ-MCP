import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Trash2 } from "lucide-react";
import { getAgendaEvent, listDossiers } from "@/lib/queries";
import { Card, PageHeader, Field, inputClass, Button, LinkButton } from "@/components/ui";
import { AGENDA_EVENT_TYPE_LABELS } from "@/lib/types";
import { updateAgendaEvent, deleteAgendaEvent } from "../actions";

export default async function EditAgendaEventPage({ params }: { params: { id: string } }) {
  const event = await getAgendaEvent(params.id);
  if (!event) notFound();

  const dossiers = await listDossiers();
  const action = updateAgendaEvent.bind(null, event.id);
  const deleteAction = deleteAgendaEvent.bind(null, event.id, "/agenda");
  const dateDebutValue = format(new Date(event.date_debut), "yyyy-MM-dd'T'HH:mm");
  const dateFinValue = event.date_fin ? format(new Date(event.date_fin), "yyyy-MM-dd'T'HH:mm") : "";

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Modifier l'événement"
        description={event.titre}
        actions={
          <LinkButton href="/agenda" variant="outline">
            <ArrowLeft className="h-4 w-4" /> Retour
          </LinkButton>
        }
      />
      <Card className="p-6">
        <form action={action} className="space-y-3">
          <Field label="Titre">
            <input name="titre" required defaultValue={event.titre} className={inputClass} />
          </Field>
          <Field label="Type">
            <select name="type" defaultValue={event.type} className={inputClass}>
              {Object.entries(AGENDA_EVENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date et heure de début">
            <input name="date_debut" type="datetime-local" required defaultValue={dateDebutValue} className={inputClass} />
          </Field>
          <Field label="Date et heure de fin (optionnel, si l'événement dure plusieurs jours)">
            <input name="date_fin" type="datetime-local" defaultValue={dateFinValue} className={inputClass} />
          </Field>
          <Field label="Dossier lié (optionnel)">
            <select name="dossier_id" defaultValue={event.dossier_id ?? ""} className={inputClass}>
              <option value="">—</option>
              {dossiers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.reference} — {d.clients?.prenom} {d.clients?.nom}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lieu">
            <input name="lieu" defaultValue={event.lieu ?? ""} placeholder="Ex. Lyon → Marseille" className={inputClass} />
          </Field>
          <Field label="Notes">
            <textarea name="notes" rows={2} defaultValue={event.notes ?? ""} className={inputClass} />
          </Field>
          <div className="flex items-center gap-2 pt-1">
            <Button type="submit">Enregistrer les modifications</Button>
          </div>
        </form>

        <form action={deleteAction} className="mt-4 pt-4 border-t border-line">
          <Button type="submit" variant="danger">
            <Trash2 className="h-4 w-4" /> Supprimer cet événement
          </Button>
        </form>
      </Card>
    </div>
  );
}
