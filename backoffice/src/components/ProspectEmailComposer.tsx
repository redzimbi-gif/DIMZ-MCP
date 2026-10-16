"use client";

import { useState } from "react";
import { Mail, X, Send, Copy, Check, ExternalLink } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { PROSPECTION_VARIABLES, type ProspectionModele } from "@/lib/prospection-email";

/**
 * Bouton « Envoyer un e-mail » et son composeur, à placer dans une Card. Le
 * mail est pré-rempli à partir d'un modèle (variables déjà remplacées côté
 * serveur), puis entièrement modifiable avant l'envoi : destinataire, objet et
 * corps du message.
 *
 * Trois façons d'envoyer, parce que la plupart des fiches françaises n'ont pas
 * d'adresse en base et que certaines réponses valent mieux d'être envoyées
 * depuis sa propre boîte : l'envoi direct par le back-office, la copie du
 * texte à coller ailleurs, et l'ouverture du logiciel de messagerie. Le
 * composeur s'ouvre donc même sans adresse sur la fiche.
 *
 * Panneau déplié sur place plutôt que fenêtre modale : le back-office n'a pas
 * de composant de modale, et la fiche du prospect reste lisible à côté pendant
 * la rédaction.
 */
export function ProspectEmailComposer({
  action,
  email,
  modeles,
  ouvertParDefaut = false,
}: {
  action: (formData: FormData) => Promise<void>;
  email: string | null;
  modeles: ProspectionModele[];
  ouvertParDefaut?: boolean;
}) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const [modele, setModele] = useState(modeles[0]);
  const [destinataire, setDestinataire] = useState(email ?? "");
  const [objet, setObjet] = useState(modeles[0].objet);
  const [corps, setCorps] = useState(modeles[0].corps);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [copie, setCopie] = useState(false);

  // L'envoi passe par Resend : quelques secondes pendant lesquelles il ne faut
  // pas que l'équipe clique deux fois et envoie deux mails au même prospect.
  async function envoyer(formData: FormData) {
    setEnvoiEnCours(true);
    try {
      await action(formData);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  // Changer de modèle réécrit le brouillon : on prévient si du texte a été saisi.
  function changerModele(cle: string) {
    const suivant = modeles.find((m) => m.cle === cle);
    if (!suivant || suivant.cle === modele.cle) return;
    const modifie = objet !== modele.objet || corps !== modele.corps;
    if (modifie && !window.confirm("Remplacer le brouillon en cours par le modèle choisi ?")) {
      return;
    }
    setModele(suivant);
    setObjet(suivant.objet);
    setCorps(suivant.corps);
  }

  /**
   * Copie l'objet et le message, pour les coller dans n'importe quelle boîte
   * mail. Si le navigateur refuse l'accès au presse-papiers, on sélectionne le
   * texte à la place : il reste un Ctrl+C à faire, mais rien n'est perdu.
   */
  async function copier() {
    const texte = `${objet}\n\n${corps}`;
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2500);
    } catch {
      const zone = document.querySelector<HTMLTextAreaElement>('textarea[name="corps"]');
      zone?.select();
      window.alert("Copie automatique refusée par le navigateur. Le message est sélectionné : fais Ctrl+C.");
    }
  }

  const lienMessagerie = `mailto:${encodeURIComponent(destinataire)}?subject=${encodeURIComponent(
    objet
  )}&body=${encodeURIComponent(corps)}`;

  if (!ouvert) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Mail de prospection</h2>
          <p className="text-xs text-ink-soft mt-0.5">
            {email
              ? `Modèle pré-rempli, modifiable avant l'envoi · ${email}`
              : "Modèle pré-rempli, à copier ou à envoyer en saisissant une adresse"}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setOuvert(true)}>
          <Mail className="h-4 w-4" /> Rédiger un e-mail
        </Button>
      </div>
    );
  }

  return (
    <form action={envoyer} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Mail de prospection</h2>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          aria-label="Fermer le composeur"
          className="rounded-md p-1 text-ink-faint hover:bg-surface-sunken hover:text-ink focus-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Field label="Modèle">
        <select
          value={modele.cle}
          onChange={(e) => changerModele(e.target.value)}
          className={inputClass}
        >
          {modeles.map((m) => (
            <option key={m.cle} value={m.cle}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Destinataire">
          <input
            name="destinataire"
            type="email"
            value={destinataire}
            onChange={(e) => setDestinataire(e.target.value)}
            placeholder={email ? undefined : "Adresse du prospect (absente de la fiche)"}
            className={inputClass}
          />
        </Field>
        <Field label="Objet">
          <input
            name="objet"
            required
            value={objet}
            onChange={(e) => setObjet(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Message">
        <textarea
          name="corps"
          required
          rows={16}
          value={corps}
          onChange={(e) => setCorps(e.target.value)}
          className={`${inputClass} font-normal leading-relaxed`}
        />
      </Field>

      <details className="text-xs text-ink-soft">
        <summary className="cursor-pointer select-none hover:text-ink">
          Variables utilisables dans le texte
        </summary>
        <ul className="mt-2 space-y-1">
          {PROSPECTION_VARIABLES.map((v) => (
            <li key={v.cle}>
              <code className="text-ink">{`{{${v.cle}}}`}</code> — {v.label}
            </li>
          ))}
        </ul>
        <p className="mt-2">
          Elles sont déjà remplacées dans le texte ci-dessus. En retaper une, elle sera remplie à
          l&apos;envoi avec les données de cette fiche.
        </p>
      </details>

      <label className="flex items-start gap-2 text-xs text-ink-soft">
        <input
          type="checkbox"
          name="note"
          value="1"
          defaultChecked
          className="mt-0.5 rounded border-line focus-ring"
        />
        <span>Enregistrer l&apos;envoi dans l&apos;historique des échanges</span>
      </label>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button type="submit" disabled={envoiEnCours || !destinataire.trim()}>
          <Send className="h-4 w-4" /> {envoiEnCours ? "Envoi en cours…" : "Envoyer depuis DIMZ"}
        </Button>
        <Button type="button" variant="outline" onClick={copier}>
          {copie ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copie ? "Copié" : "Copier le message"}
        </Button>
        <a
          href={lienMessagerie}
          className="inline-flex items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-ink-soft hover:bg-surface-sunken transition-colors focus-ring"
        >
          <ExternalLink className="h-4 w-4" /> Ouvrir dans ma messagerie
        </a>
      </div>

      <p className="text-xs text-ink-faint">
        « Envoyer depuis DIMZ » part de l&apos;adresse d&apos;envoi du back-office, mise en forme
        aux couleurs DIMZ, et laisse une trace sur la fiche. Les deux autres boutons te laissent
        envoyer depuis ta propre boîte : rien n&apos;est alors enregistré ici.
      </p>
    </form>
  );
}
