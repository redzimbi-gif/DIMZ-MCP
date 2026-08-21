import { notFound } from "next/navigation";
import Image from "next/image";
import { Check, ExternalLink } from "lucide-react";
import { clsx } from "clsx";
import { getDossierByToken, getDossierAnnonces, getDossierMessages } from "@/lib/queries";
import { getSignedUrl } from "@/lib/storage";
import { formatCurrency, formatRelative } from "@/lib/format";
import { Logo } from "@/components/Logo";
import { getEtapesOffre, resolveEtapesConvoyage } from "@/lib/etapes";
import { upgradeOffreDepuisSuivi, sendMessageClient } from "./actions";

export const metadata = {
  title: "Suivi de votre dossier — Dimz",
  robots: { index: false, follow: false },
};

export default async function ClientPortalPage({ params }: { params: { token: string } }) {
  const dossier = await getDossierByToken(params.token);
  if (!dossier) notFound();

  const annonces = dossier.offre === "convoyage_seul" ? [] : await getDossierAnnonces(dossier.id);
  const messages = await getDossierMessages(dossier.id);
  const sendMessageAction = sendMessageClient.bind(null, params.token);
  const annoncesAvecPhoto = await Promise.all(
    annonces.map(async (a) => ({ ...a, photoUrl: a.photos[0] ? await getSignedUrl(a.photos[0]) : null }))
  );

  const isConvoyage = dossier.offre === "convoyage_seul";
  const refuse = isConvoyage && dossier.convoyage_decision === "refuse";
  const etapes = isConvoyage ? resolveEtapesConvoyage(dossier.devis_envoye_at) : getEtapesOffre(dossier.offre);
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

        {dossier.offre === "decouverte" && dossier.etape_client === "reponse_envoyee" ? (
          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg2 p-6 text-center">
            <p className="text-sm font-semibold text-blue-700 mb-1">Envie d'aller plus loin ?</p>
            <p className="text-sm text-ink-soft mb-4">
              Votre copilote peut prendre le relais : de la recherche approfondie jusqu'à la remise des clés.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <form action={upgradeOffreDepuisSuivi.bind(null, params.token, "copilote")}>
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-blue-500 text-blue-600 hover:bg-blue-100 text-sm font-medium px-4 py-2.5 transition-colors"
                >
                  Passer à l'offre Copilote
                </button>
              </form>
              <form action={upgradeOffreDepuisSuivi.bind(null, params.token, "copilote_plus")}>
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2.5 transition-colors"
                >
                  Passer à l'offre Copilote Plus
                </button>
              </form>
            </div>
          </div>
        ) : null}

        {dossier.offre === "copilote" && dossier.etape_client === "dossier_envoye" ? (
          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg2 p-6 text-center">
            <p className="text-sm font-semibold text-blue-700 mb-1">Prêt à passer la vitesse supérieure ?</p>
            <p className="text-sm text-ink-soft mb-4">
              Avec Copilote Plus, votre copilote prend le relais jusqu'à la remise des clés, et le montant déjà
              réglé pour Copilote est intégralement déduit.
            </p>
            <form action={upgradeOffreDepuisSuivi.bind(null, params.token, "copilote_plus")}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2.5 transition-colors"
              >
                Passer à l'offre Copilote Plus
              </button>
            </form>
          </div>
        ) : null}

        {annoncesAvecPhoto.length > 0 ? (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-ink px-1 mb-3">
              Sélection de votre copilote ({annoncesAvecPhoto.length})
            </h2>
            <div className="space-y-4">
              {annoncesAvecPhoto.map((a) => (
                <div
                  key={a.id}
                  className="bg-surface border border-line rounded-lg2 shadow-card overflow-hidden"
                >
                  {a.photoUrl ? (
                    <div className="relative w-full aspect-[16/9] bg-surface-sunken">
                      <Image src={a.photoUrl} alt="" fill className="object-cover" unoptimized />
                    </div>
                  ) : null}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink truncate">{a.titre}</p>
                        <p className="text-sm text-ink-soft mt-0.5">
                          {[a.annee, a.kilometrage ? `${a.kilometrage.toLocaleString("fr-FR")} km` : null, a.localisation]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      {a.score_confiance != null ? (
                        <div className="shrink-0 text-center bg-blue-50 text-blue-700 rounded-md px-2.5 py-1.5">
                          <p className="text-base font-semibold tnum leading-none">{a.score_confiance}/10</p>
                          <p className="text-[10px] font-medium uppercase tracking-wide mt-0.5">Score DIMZ</p>
                        </div>
                      ) : null}
                    </div>

                    <p className="text-sm font-medium text-blue-600 mt-2 tnum">
                      {a.prix ? formatCurrency(a.prix) : "Prix non renseigné"}
                      {a.prix_negocie ? ` → ${formatCurrency(a.prix_negocie)} négocié` : ""}
                    </p>

                    {a.avis_copilote ? (
                      <p className="text-sm text-ink mt-3 bg-surface-sunken rounded-md p-3 leading-relaxed">
                        « {a.avis_copilote} »
                      </p>
                    ) : null}

                    {a.points_forts || a.points_faibles ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
                        {a.points_forts ? <p className="text-good">+ {a.points_forts}</p> : null}
                        {a.points_faibles ? <p className="text-bad">− {a.points_faibles}</p> : null}
                      </div>
                    ) : null}

                    {a.lien ? (
                      <a
                        href={a.lien}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-3"
                      >
                        Voir l'annonce <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {dossier.offre === "copilote_plus" && dossier.etape_client === "livraison" ? (
          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg2 p-6 text-center">
            <p className="text-sm font-semibold text-blue-700 mb-1">Votre véhicule vous a été livré 🎉</p>
            <p className="text-sm text-ink-soft mb-4">
              Un dernier mot : votre avis nous aide à améliorer l'accompagnement DIMZ pour les prochains clients.
            </p>
            <a
              href="https://dimz-copilote.com/dimz-beta.html#test"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2.5"
            >
              Donner mon avis (5 min)
            </a>
          </div>
        ) : null}

        <div className="mt-6 bg-surface border border-line rounded-lg2 shadow-card p-6">
          <p className="text-sm font-semibold text-ink mb-1">Messages</p>
          <p className="text-xs text-ink-soft mb-4">
            Une question sur votre dossier ? Écrivez directement à votre copilote.
          </p>
          {messages.length > 0 ? (
            <ul className="space-y-2.5 mb-4">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={clsx(
                    "rounded-lg2 px-3.5 py-2.5 text-sm max-w-[85%]",
                    m.auteur === "client" ? "bg-blue-50 text-ink ml-auto" : "bg-surface-sunken text-ink"
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.contenu}</p>
                  <p className="text-[11px] text-ink-faint mt-1">
                    {m.auteur === "client" ? "Vous" : "Votre copilote"} · {formatRelative(m.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
          <form action={sendMessageAction} className="flex gap-2 pt-3 border-t border-line">
            <textarea
              name="contenu"
              required
              rows={2}
              placeholder="Écrire un message…"
              className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue-500 bg-surface"
            />
            <button
              type="submit"
              className="shrink-0 self-end inline-flex items-center justify-center rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              Envoyer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
