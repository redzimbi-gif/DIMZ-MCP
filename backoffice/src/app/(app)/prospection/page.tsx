import Link from "next/link";
import { Plus, Search, PhoneCall, Target, Handshake, CalendarClock } from "lucide-react";
import {
  listProspects,
  getProspectStats,
  listVillesProspects,
  aujourdhui,
  PROSPECTS_PAR_PAGE,
} from "@/lib/queries";
import {
  Card,
  PageHeader,
  LinkButton,
  EmptyState,
  StatCard,
  ProspectStatutBadge,
  Button,
  inputClass,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import {
  PROSPECT_STATUTS,
  PROSPECT_STATUT_LABELS,
  PROSPECT_CATEGORIES,
  PROSPECT_CATEGORIE_LABELS,
  PROSPECT_ZONES,
  PROSPECT_ZONE_LABELS,
} from "@/lib/types";

interface ProspectionSearchParams {
  q?: string;
  statut?: string;
  categorie?: string;
  ville?: string;
  zone?: string;
  relance?: string;
  page?: string;
}

export default async function ProspectionPage({
  searchParams,
}: {
  searchParams: ProspectionSearchParams;
}) {
  const page = Number(searchParams.page) || 1;
  const [{ rows, total, pages }, stats, villes] = await Promise.all([
    listProspects({ ...searchParams, page }),
    getProspectStats(),
    listVillesProspects(),
  ]);

  const filtreActif = Boolean(
    searchParams.q ||
      searchParams.statut ||
      searchParams.categorie ||
      searchParams.ville ||
      searchParams.zone ||
      searchParams.relance
  );

  // Conserve les filtres en changeant de page (il n'existe pas de composant de
  // pagination partagé : cette liste est la seule paginée du back-office).
  function lienPage(n: number) {
    const params = new URLSearchParams();
    for (const [cle, valeur] of Object.entries(searchParams)) {
      if (valeur && cle !== "page") params.set(cle, String(valeur));
    }
    params.set("page", String(n));
    return `/prospection?${params.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title="Prospection"
        description="Professionnels de l'automobile à démarcher pour le convoyage."
        actions={
          <LinkButton href="/prospection/new">
            <Plus className="h-4 w-4" /> Nouveau prospect
          </LinkButton>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Link href="/prospection">
          <StatCard label="Total" value={stats.total} icon={<Target className="h-4 w-4" />} />
        </Link>
        <Link href="/prospection?statut=a_contacter">
          <StatCard
            label="À contacter"
            value={stats.compteurs.a_contacter ?? 0}
            icon={<PhoneCall className="h-4 w-4" />}
          />
        </Link>
        <Link href="/prospection?relance=1">
          <StatCard
            label="À relancer"
            value={stats.relancesDues}
            hint="Relance prévue aujourd'hui ou dépassée"
            tone="warn"
            icon={<CalendarClock className="h-4 w-4" />}
          />
        </Link>
        <Link href="/prospection?statut=converti">
          <StatCard
            label="Devenus clients"
            value={stats.compteurs.converti ?? 0}
            tone="good"
            icon={<Handshake className="h-4 w-4" />}
          />
        </Link>
      </div>

      <Card className="p-4 mb-4">
        <form className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint" />
            <input
              type="search"
              name="q"
              defaultValue={searchParams.q}
              placeholder="Nom, ville, téléphone, SIRET…"
              className="w-full rounded-md border border-line bg-surface pl-9 pr-3 py-2 text-sm focus-ring"
            />
          </div>
          <select name="statut" defaultValue={searchParams.statut ?? ""} className={`${inputClass} w-auto`}>
            <option value="">Tous les statuts</option>
            {PROSPECT_STATUTS.map((s) => (
              <option key={s} value={s}>
                {PROSPECT_STATUT_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            name="categorie"
            defaultValue={searchParams.categorie ?? ""}
            className={`${inputClass} w-auto`}
          >
            <option value="">Toutes les catégories</option>
            {PROSPECT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {PROSPECT_CATEGORIE_LABELS[c]}
              </option>
            ))}
          </select>
          <select name="zone" defaultValue={searchParams.zone ?? ""} className={`${inputClass} w-auto`}>
            <option value="">Toutes les zones</option>
            {PROSPECT_ZONES.map((z) => (
              <option key={z} value={z}>
                {PROSPECT_ZONE_LABELS[z]}
              </option>
            ))}
          </select>
          {villes.length > 0 ? (
            <select name="ville" defaultValue={searchParams.ville ?? ""} className={`${inputClass} w-auto`}>
              <option value="">Toutes les villes</option>
              {villes.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          ) : null}
          {searchParams.relance ? <input type="hidden" name="relance" value="1" /> : null}
          <Button type="submit" variant="outline">
            Filtrer
          </Button>
          {filtreActif ? (
            <LinkButton href="/prospection" variant="ghost">
              Réinitialiser
            </LinkButton>
          ) : null}
        </form>
      </Card>

      <Card>
        {rows.length === 0 ? (
          filtreActif ? (
            <EmptyState
              title="Aucun prospect ne correspond"
              description="Aucun résultat pour ces filtres. Essaie de les élargir ou de les réinitialiser."
            />
          ) : (
            <EmptyState
              title="Aucun prospect pour le moment"
              description="Ajoute un prospect à la main, ou lance le recensement des professionnels de l'automobile depuis l'onglet Actions du dépôt."
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-ink-soft uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Établissement</th>
                  <th className="px-5 py-3 font-medium">Catégorie</th>
                  <th className="px-5 py-3 font-medium">Téléphone</th>
                  <th className="px-5 py-3 font-medium">Responsable</th>
                  <th className="px-5 py-3 font-medium">Statut</th>
                  <th className="px-5 py-3 font-medium">Relance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((p) => {
                  const relanceDue = p.prochaine_relance_le && p.prochaine_relance_le <= aujourdhui();
                  return (
                    <tr key={p.id} className="hover:bg-surface-sunken transition-colors">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/prospection/${p.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {p.raison_sociale}
                        </Link>
                        <p className="text-xs text-ink-soft">
                          {[p.code_postal, p.ville].filter(Boolean).join(" ") || "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-ink-soft">
                        {PROSPECT_CATEGORIE_LABELS[p.categorie]}
                      </td>
                      <td className="px-5 py-3.5 text-ink whitespace-nowrap">{p.telephone ?? "—"}</td>
                      <td className="px-5 py-3.5 text-ink-soft">{p.responsable_nom ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        <ProspectStatutBadge statut={p.statut} />
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {p.prochaine_relance_le ? (
                          <span className={relanceDue ? "text-warn font-medium" : "text-ink-soft"}>
                            {formatDate(p.prochaine_relance_le)}
                          </span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {total > PROSPECTS_PAR_PAGE ? (
        <div className="flex items-center justify-between gap-3 mt-4">
          {page > 1 ? (
            <LinkButton href={lienPage(page - 1)} variant="outline">
              ← Précédent
            </LinkButton>
          ) : (
            <span />
          )}
          <p className="text-xs text-ink-soft tnum">
            Page {page} sur {pages} · {total} prospect{total > 1 ? "s" : ""}
          </p>
          {page < pages ? (
            <LinkButton href={lienPage(page + 1)} variant="outline">
              Suivant →
            </LinkButton>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}
