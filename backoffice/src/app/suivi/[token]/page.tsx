import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { clsx } from "clsx";
import { getDossierByToken } from "@/lib/queries";
import { Logo } from "@/components/Logo";
import { DOSSIER_STATUTS, DOSSIER_STATUT_LABELS } from "@/lib/types";

export const metadata = {
  title: "Suivi de votre dossier — Dimz",
  robots: { index: false, follow: false },
};

export default async function ClientPortalPage({ params }: { params: { token: string } }) {
  const dossier = await getDossierByToken(params.token);
  if (!dossier) notFound();

  const currentIndex = DOSSIER_STATUTS.indexOf(dossier.statut);

  return (
    <div className="min-h-screen bg-surface-sunken py-12 px-4">
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

          <ol className="space-y-0.5">
            {DOSSIER_STATUTS.map((statut, index) => {
              const done = index < currentIndex;
              const current = index === currentIndex;
              return (
                <li key={statut} className="flex items-center gap-3 py-2.5">
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
                    {DOSSIER_STATUT_LABELS[statut]}
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
        </div>

        <p className="text-center text-xs text-ink-faint mt-6">
          Une question sur votre dossier ? Votre copilote DIMZ vous répond.
        </p>
      </div>
    </div>
  );
}
