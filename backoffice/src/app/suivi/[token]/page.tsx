import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { clsx } from "clsx";
import { getDossierByToken } from "@/lib/queries";
import { Logo } from "@/components/Logo";
import { getEtapesOffre, ETAPES_CONVOYAGE } from "@/lib/etapes";

export const metadata = {
  title: "Suivi de votre dossier — Dimz",
  robots: { index: false, follow: false },
};

export default async function ClientPortalPage({ params }: { params: { token: string } }) {
  const dossier = await getDossierByToken(params.token);
  if (!dossier) notFound();

  const isConvoyage = dossier.offre === "convoyage_seul";
  const refuse = isConvoyage && dossier.convoyage_decision === "refuse";
  const etapes = isConvoyage ? ETAPES_CONVOYAGE : getEtapesOffre(dossier.offre);
  const currentIndex = Math.max(
    0,
    etapes.findIndex((e) => e.key === dossier.etape_client)
  );

  return (
    <div className="min-h-viewport bg-surface-sunken py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-8 flex justify-center">
          <Logo className="text-xl" />
        </div>

        <div className="bg-surface border border-line rounded-lg2 shadow-card p-8">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
            Suivi de dossier
          </p>
          <h1 className="text-xl font-semibold text-ink mb-1">
            Bonjour {dossier.clients?.prenom} {dossier.clients?.nom} 👋
          </h1>
          <p className="text-sm text-ink-soft mb-8">
            Voici l'avancement de votre dossier {dossier.reference}.
          </p>

          {refuse ? (
            <div className="rounded-md bg-bad-bg text-bad px-4 py-3.5 text-sm leading-relaxed">
              Après étude, nous ne sommes malheureusement pas en mesure de donner suite à cette demande pour le
              moment. Nous sommes sincèrement désolés pour la gêne occasionnée et restons à votre disposition pour
              toute question.
            </div>
          ) : (
            <ol className="space-y-0.5">
              {etapes.map((etape, index) => {
                const done = index < currentIndex;
                const current = index === currentIndex;
                return (
                  <li key={etape.key} className="flex items-center gap-3 py-2.5">
                    <span
                      className={clsx(
                        "flex items-center justify-center h-6 w-6 rounded-full shrink-0 text-xs",
                        done && "bg-blue-500 text-white",
                        current && "bg-blue-50 text-blue-600 ring-2 ring-blue-500",
                        !done && !current && "bg-surface-sunken text-ink-faint border border-line"
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span
                      className={clsx(
                        "text-sm",
                        done && "text-ink-soft line-through decoration-ink-faint",
                        current && "text-ink font-semibold",
                        !done && !current && "text-ink-faint"
                      )}
                    >
                      {etape.label}
                    </span>
                    {current ? (
                      <span className="ml-auto text-[10px] font-semibold text-blue-600 uppercase tracking-wide">
                        En cours
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <p className="text-center text-xs text-ink-faint mt-6">
          Une question sur votre dossier ? Votre copilote DIMZ vous répond.
        </p>
      </div>
    </div>
  );
}
