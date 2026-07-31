import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
import { listAgendaEvents, listDossiers } from "@/lib/queries";
import { Card, PageHeader, Field, inputClass, Button, Badge } from "@/components/ui";
import { AGENDA_EVENT_TYPE_LABELS, type AgendaEventType } from "@/lib/types";
import { createAgendaEvent } from "./actions";

const TYPE_TONES: Record<AgendaEventType, "blue" | "warn" | "good"> = {
  rendez_vous: "blue",
  visioconference: "blue",
  inspection: "warn",
  convoyage: "blue",
  livraison: "good",
};

export default async function AgendaPage({ searchParams }: { searchParams: { month?: string } }) {
  const monthParam = searchParams.month
    ? parse(searchParams.month, "yyyy-MM", new Date())
    : new Date();

  const monthStart = startOfMonth(monthParam);
  const monthEnd = endOfMonth(monthParam);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const events = await listAgendaEvents(gridStart.toISOString(), gridEnd.toISOString());
  const dossiers = await listDossiers();

  const eventsByDay = new Map<string, typeof events>();
  events.forEach((e) => {
    const key = format(new Date(e.date_debut), "yyyy-MM-dd");
    eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), e]);
  });

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
              return (
                <div
                  key={key}
                  className={clsx(
                    "min-h-[92px] rounded-md border p-1.5 text-left align-top",
                    isSameMonth(day, monthStart) ? "border-line bg-surface" : "border-line-soft bg-surface-sunken",
                    isSameDay(day, today) && "ring-1 ring-blue-500"
                  )}
                >
                  <span
                    className={clsx(
                      "text-xs tnum",
                      isSameMonth(day, monthStart) ? "text-ink-soft" : "text-ink-faint"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className="text-[11px] leading-tight rounded px-1.5 py-1 bg-blue-50 text-blue-700 truncate"
                        title={e.titre}
                      >
                        {e.titre}
                      </div>
                    ))}
                    {dayEvents.length > 3 ? (
                      <div className="text-[10px] text-ink-faint px-1">+{dayEvents.length - 3}</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 h-fit">
          <h2 className="text-sm font-semibold text-ink mb-4">Ajouter un événement</h2>
          <form action={createAgendaEvent} className="space-y-3">
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
            <Field label="Date et heure">
              <input name="date_debut" type="datetime-local" required className={inputClass} />
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
              <input name="lieu" className={inputClass} />
            </Field>
            <Field label="Notes">
              <textarea name="notes" rows={2} className={inputClass} />
            </Field>
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </form>

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
  );
}
