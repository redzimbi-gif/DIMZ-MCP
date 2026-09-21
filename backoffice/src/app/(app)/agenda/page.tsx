import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, CheckCircle2 } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  format,
  parse,
} from "date-fns";
import { fr } from "date-fns/locale";
import { clsx } from "clsx";
import { listAgendaEvents, listConvoyagesExternesAFaire, listDossiers } from "@/lib/queries";
import { Card, PageHeader, Field, inputClass, Button, Badge, EmptyState } from "@/components/ui";
import { AutoResetForm } from "@/components/AutoResetForm";
import { AGENDA_EVENT_TYPE_LABELS, type AgendaEventType } from "@/lib/types";
import { createAgendaEvent, marquerConvoyageExterneTermine } from "./actions";

const TYPE_TONES: Record<AgendaEventType, "blue" | "warn" | "good" | "neutral"> = {
  rendez_vous: "blue",
  visioconference: "blue",
  inspection: "warn",
  convoyage: "blue",
  livraison: "good",
  convoyage_externe: "warn",
  conge: "neutral",
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { month?: string; day?: string };
}) {
  const monthParam = searchParams.month
    ? parse(searchParams.month, "yyyy-MM", new Date())
    : new Date();
  const monthKey = format(monthParam, "yyyy-MM");
  const selectedDay = searchParams.day ?? null;

  const monthStart = startOfMonth(monthParam);
  const monthEnd = endOfMonth(monthParam);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const events = await listAgendaEvents(gridStart.toISOString(), gridEnd.toISOString());
  const dossiers = await listDossiers();
  const convoyagesAFaire = await listConvoyagesExternesAFaire();

  // Un événement avec date_fin apparaît sur chaque jour qu'il traverse, pas
  // seulement son jour de départ (cas des convoyages ou congés sur plusieurs
  // jours).
  const eventsByDay = new Map<string, typeof events>();
  events.forEach((e) => {
    const debut = new Date(e.date_debut);
    const fin = e.date_fin ? new Date(e.date_fin) : debut;
    const jours = fin > debut ? eachDayOfInterval({ start: debut, end: fin }) : [debut];
    jours.forEach((jour) => {
      const key = format(jour, "yyyy-MM-dd");
      eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), e]);
    });
  });

  // Jours tombant dans la plage d'un congé : case assombrie sur la grille.
  const congeDays = new Set<string>();
  events
    .filter((e) => e.type === "conge")
    .forEach((e) => {
      const debut = new Date(e.date_debut);
      const fin = e.date_fin ? new Date(e.date_fin) : debut;
      const jours = fin > debut ? eachDayOfInterval({ start: debut, end: fin }) : [debut];
      jours.forEach((jour) => congeDays.add(format(jour, "yyyy-MM-dd")));
    });

  const selectedDayEvents = selectedDay ? eventsByDay.get(selectedDay) ?? [] : [];

  const prevMonth = format(subMonths(monthStart, 1), "yyyy-MM");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");
  const today = new Date();

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Rendez-vous, visioconférences, inspections, convoyages et livraisons."
      />

      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-sm font-semibold text-ink capitalize">
              {format(monthStart, "MMMM yyyy", { locale: fr })}
            </h2>
            <div className="flex items-center gap-1">
              <Link
                href={`/agenda?month=${prevMonth}`}
                className="p-1.5 rounded-md hover:bg-surface-sunken text-ink-soft"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <Link
                href={`/agenda?month=${nextMonth}`}
                className="p-1.5 rounded-md hover:bg-surface-sunken text-ink-soft"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-medium text-ink-faint uppercase mb-2">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDay.get(key) ?? [];
              const isSelected = selectedDay === key;
              const isConge = congeDays.has(key);
              return (
                <div
                  key={key}
                  className={clsx(
                    "relative min-h-[92px] rounded-md border p-1.5 text-left align-top",
                    isConge ? "bg-ink/10 border-ink/15" : isSameMonth(day, monthStart) ? "border-line bg-surface" : "border-line-soft bg-surface-sunken",
                    isSameDay(day, today) && "ring-1 ring-blue-500",
                    isSelected && !isConge && "border-blue-500 bg-blue-50"
                  )}
                >
                  {/* Lien plein-cellule, sous le contenu : cliquer n'importe où dans la case ouvre le panneau du jour. */}
                  <Link
                    href={`/agenda?month=${monthKey}&day=${key}`}
                    className="absolute inset-0 rounded-md"
                    aria-label={`Voir les événements du ${format(day, "d MMMM", { locale: fr })}`}
                  />
                  <div className="relative">
                    <Link
                      href={`/agenda?month=${monthKey}&day=${key}`}
                      className={clsx(
                        "relative inline-flex items-center justify-center h-5 w-5 rounded-full text-xs tnum font-medium hover:bg-blue-100",
                        isSelected ? "bg-blue-500 text-white hover:bg-blue-600" : isSameMonth(day, monthStart) ? "text-ink-soft" : "text-ink-faint"
                      )}
                    >
                      {format(day, "d")}
                    </Link>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 3).map((e) => (
                        <Link
                          key={e.id}
                          href={`/agenda/${e.id}`}
                          className="relative block text-[11px] leading-tight rounded px-1.5 py-1 bg-blue-50 text-blue-700 truncate hover:bg-blue-100"
                          title={e.titre}
                        >
                          {e.titre}
                        </Link>
                      ))}
                      {dayEvents.length > 3 ? (
                        <Link
                          href={`/agenda?month=${monthKey}&day=${key}`}
                          className="relative block text-[10px] text-ink-faint px-1 hover:text-blue-600"
                        >
                          +{dayEvents.length - 3}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          {selectedDay ? (
            <Card className="p-5 h-fit">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-ink capitalize">
                  {format(new Date(selectedDay + "T00:00:00"), "EEEE d MMMM", { locale: fr })}
                </h2>
                <Link href={`/agenda?month=${monthKey}`} className="text-xs text-ink-soft hover:text-ink">
                  Fermer
                </Link>
              </div>
              {selectedDayEvents.length === 0 ? (
                <EmptyState title="Aucun événement ce jour-là" />
              ) : (
                <ul className="space-y-2">
                  {selectedDayEvents.map((e) => (
                    <li key={e.id} className="rounded-md border border-line p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge tone={TYPE_TONES[e.type]}>{AGENDA_EVENT_TYPE_LABELS[e.type]}</Badge>
                            <span className="text-xs text-ink-faint tnum">
                              {format(new Date(e.date_debut), "HH:mm")}
                              {e.date_fin ? ` — ${format(new Date(e.date_fin), "HH:mm")}` : ""}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-ink mt-1 truncate">{e.titre}</p>
                          {e.lieu ? <p className="text-xs text-ink-soft mt-0.5 truncate">{e.lieu}</p> : null}
                        </div>
                        <Link
                          href={`/agenda/${e.id}`}
                          className="shrink-0 text-xs font-medium text-blue-600 hover:underline"
                        >
                          Modifier
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

        <Card className="p-5 h-fit">
          <h2 className="text-sm font-semibold text-ink mb-4">Ajouter un événement</h2>
          <AutoResetForm action={createAgendaEvent} className="space-y-3">
            <Field label="Titre">
              <input name="titre" required className={inputClass} />
            </Field>
            <Field label="Type">
              <select name="type" className={inputClass}>
                {Object.entries(AGENDA_EVENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date et heure de début">
              <input
                name="date_debut"
                type="datetime-local"
                required
                defaultValue={selectedDay ? `${selectedDay}T09:00` : undefined}
                className={inputClass}
              />
            </Field>
            <Field label="Date et heure de fin (optionnel, si l'événement dure plusieurs jours)">
              <input name="date_fin" type="datetime-local" className={inputClass} />
            </Field>
            <Field label="Dossier lié (optionnel)">
              <select name="dossier_id" className={inputClass}>
                <option value="">—</option>
                {dossiers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.reference} — {d.clients?.prenom} {d.clients?.nom}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Lieu">
              <input name="lieu" placeholder="Ex. Lyon → Marseille" className={inputClass} />
            </Field>
            <Field label="Notes">
              <textarea name="notes" rows={2} className={inputClass} />
            </Field>
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </AutoResetForm>

          <div className="mt-6 pt-4 border-t border-line">
            <h3 className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">Légende</h3>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(AGENDA_EVENT_TYPE_LABELS).map(([value, label]) => (
                <Badge key={value} tone={TYPE_TONES[value as AgendaEventType]}>
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
        </div>
      </div>

      <Card className="p-5 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-4 w-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-ink">Convoyages hors DIMZ à traiter</h2>
        </div>
        {convoyagesAFaire.length === 0 ? (
          <EmptyState
            title="Aucun convoyage hors DIMZ en attente"
            description="Ajoute-en un via « Ajouter un événement » avec le type Convoyage (hors DIMZ)."
          />
        ) : (
          <ul className="divide-y divide-line">
            {convoyagesAFaire.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{e.titre}</p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {e.lieu ? `${e.lieu} — ` : ""}
                    {format(new Date(e.date_debut), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                </div>
                <form action={marquerConvoyageExterneTermine.bind(null, e.id)} className="shrink-0">
                  <Button type="submit" variant="outline">
                    <CheckCircle2 className="h-4 w-4" /> Marquer comme terminé
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
