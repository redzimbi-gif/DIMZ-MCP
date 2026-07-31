import Link from "next/link";
import { FolderPlus, Loader, CheckCircle2, Wallet, Truck, PackageCheck } from "lucide-react";
import { getDashboardStats } from "@/lib/queries";
import { Card, PageHeader, StatCard, EmptyState } from "@/components/ui";
import { formatCurrency, formatDate, formatRelative } from "@/lib/format";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de l'activité DIMZ."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Nouveaux dossiers" value={stats.nouveaux} icon={<FolderPlus className="h-4 w-4" />} />
        <StatCard label="Dossiers en cours" value={stats.enCours} icon={<Loader className="h-4 w-4" />} />
        <StatCard label="Dossiers terminés" value={stats.termines} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard
          label="Chiffre d'affaires"
          value={formatCurrency(stats.chiffreAffaires)}
          hint="Dossiers terminés"
          icon={<Wallet className="h-4 w-4" />}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-ink">Missions de convoyage à venir</h2>
          </div>
          {stats.convoyagesAVenir.length === 0 ? (
            <EmptyState title="Aucune mission planifiée" />
          ) : (
            <ul className="space-y-3">
              {stats.convoyagesAVenir.map((c: any) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-ink">
                      {c.dossiers?.clients?.prenom} {c.dossiers?.clients?.nom} — {c.dossiers?.reference}
                    </p>
                    <p className="text-ink-soft text-xs mt-0.5">
                      {c.adresse_depart} → {c.adresse_arrivee}
                    </p>
                  </div>
                  <span className="text-xs text-ink-faint tnum whitespace-nowrap">
                    {c.date_convoyage ? formatDate(c.date_convoyage) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <PackageCheck className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-ink">Livraisons du jour</h2>
          </div>
          {stats.livraisonsDuJour.length === 0 ? (
            <EmptyState title="Aucune livraison prévue aujourd'hui" />
          ) : (
            <ul className="space-y-3">
              {stats.livraisonsDuJour.map((e) => (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <p className="font-medium text-ink">{e.titre}</p>
                  <span className="text-xs text-ink-faint tnum">
                    {new Date(e.date_debut).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink mb-4">Notifications</h2>
          {stats.notifications.length === 0 ? (
            <EmptyState title="Aucune notification" />
          ) : (
            <ul className="space-y-3">
              {stats.notifications.map((n) => (
                <li key={n.id} className="text-sm">
                  <Link
                    href={n.lien || "#"}
                    className="font-medium text-ink hover:text-blue-600"
                  >
                    {n.titre}
                  </Link>
                  {n.message ? <p className="text-ink-soft text-xs mt-0.5">{n.message}</p> : null}
                  <p className="text-ink-faint text-xs mt-0.5">{formatRelative(n.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink mb-4">Dernières activités</h2>
          {stats.activites.length === 0 ? (
            <EmptyState title="Aucune activité récente" />
          ) : (
            <ul className="space-y-3">
              {stats.activites.map((a) => (
                <li key={a.id} className="text-sm">
                  <p className="text-ink">{a.description}</p>
                  <p className="text-ink-faint text-xs mt-0.5">{formatRelative(a.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
