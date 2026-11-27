"use client";

import { useState } from "react";
import { Mail, X, Send, Paperclip } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { CLIENT_VARIABLES, type ClientModele, type PieceJointeOption } from "@/lib/client-email";

/**
 * Composeur de mail client : un modèle pré-rempli (variables déjà remplacées
 * côté serveur), entièrement modifiable, et une liste de pièces jointes à
 * cocher parmi les documents du client et ses devis / factures.
 *
 * Panneau déplié sur place plutôt que fenêtre modale, comme le composeur de
 * prospection (src/components/ProspectEmailComposer.tsx) : le back-office n'a
 * pas de composant de modale, et la fiche du client reste lisible à côté
 * pendant la rédaction.
 *
 * Contrairement au composeur de prospection, pas de bouton « Copier » ni
 * « Ouvrir dans ma messagerie » : l'intérêt ici est justement d'attacher des
 * fichiers qui vivent dans le back-office, ce qu'un mailto ne sait pas faire.
 */
export function ClientEmailComposer({
  action,
  email,
  modeles,
  piecesJointes,
  /** Clés des pièces jointes cochées à l'ouverture (ex. le devis qu'on vient de créer). */
  preselection = [],
}: {
  action: (formData: FormData) => Promise<void>;
  email: string | null;
  modeles: ClientModele[];
  piecesJointes: PieceJointeOption[];
  preselection?: string[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [modele, setModele] = useState(modeles[0]);
  const [destinataire, setDestinataire] = useState(email ?? "");
  const [objet, setObjet] = useState(modeles[0].objet);
  const [corps, setCorps] = useState(modeles[0].corps);
  const [cochees, setCochees] = useState<string[]>(preselection);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // L'envoi passe par Resend et peut regénérer plusieurs PDF : quelques
  // secondes pendant lesquelles il ne faut pas que l'équipe clique deux fois
  // et envoie deux mails au même client.
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

  function basculer(cle: string) {
    setCochees((actuelles) =>
      actuelles.includes(cle) ? actuelles.filter((c) => c !== cle) : [...actuelles, cle]
    );
  }

  if (!ouvert) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Mail au client</h2>
          <p className="text-xs text-ink-soft mt-0.5">
            {email
              ? `Message personnalisé, avec documents et devis en pièces jointes · ${email}`
              : "Aucune adresse sur la fiche : à saisir dans le composeur"}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setOuvert(true)}>
          <Mail className="h-4 w-4" /> Rédiger un e-mail
        </Button>
      </div>
    );
  }

  const documents = piecesJointes.filter((p) => p.categorie === "document");
  const commerciaux = piecesJointes.filter((p) => p.categorie === "document_commercial");

  return (
    <form action={envoyer} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Mail au client</h2>
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
            placeholder={email ? undefined : "Adresse du client (absente de la fiche)"}
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
          rows={14}
          value={corps}
          onChange={(e) => setCorps(e.target.value)}
          className={`${inputClass} font-normal leading-relaxed`}
        />
      </Field>

      <div>
        <p className="text-xs font-medium text-ink-soft mb-2 flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" /> Pièces jointes
        </p>
        {piecesJointes.length === 0 ? (
          <p className="text-xs text-ink-faint">
            Aucun document ni devis rattaché à ce client pour l&apos;instant. Les documents
            s&apos;ajoutent depuis un dossier, les devis depuis Facturation.
          </p>
        ) : (
          <div className="space-y-3">
            {commerciaux.length > 0 ? (
              <PiecesGroupe
                titre="Devis et factures"
                pieces={commerciaux}
                cochees={cochees}
                onToggle={basculer}
              />
            ) : null}
            {documents.length > 0 ? (
              <PiecesGroupe
                titre="Documents"
                pieces={documents}
                cochees={cochees}
                onToggle={basculer}
              />
            ) : null}
          </div>
        )}
      </div>

      <details className="text-xs text-ink-soft">
        <summary className="cursor-pointer select-none hover:text-ink">
          Variables utilisables dans le texte
        </summary>
        <ul className="mt-2 space-y-1">
          {CLIENT_VARIABLES.map((v) => (
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
          <Send className="h-4 w-4" /> {envoiEnCours ? "Envoi en cours…" : "Envoyer au client"}
        </Button>
        {cochees.length > 0 ? (
          <span className="text-xs text-ink-soft">
            {cochees.length === 1 ? "1 pièce jointe" : `${cochees.length} pièces jointes`}
          </span>
        ) : null}
      </div>

      <p className="text-xs text-ink-faint">
        Le mail part de l&apos;adresse d&apos;envoi du back-office, mis en forme aux couleurs DIMZ,
        et les réponses du client arrivent sur l&apos;adresse de l&apos;entreprise saisie dans
        Paramètres. Les devis et factures joints sont regénérés à l&apos;envoi, donc toujours à
        jour.
      </p>
    </form>
  );
}

function PiecesGroupe({
  titre,
  pieces,
  cochees,
  onToggle,
}: {
  titre: string;
  pieces: PieceJointeOption[];
  cochees: string[];
  onToggle: (cle: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink-faint mb-1.5">{titre}</p>
      <ul className="space-y-1">
        {pieces.map((piece) => (
          <li key={piece.cle}>
            <label className="flex items-start gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 -mx-2 hover:bg-surface-sunken">
              <input
                type="checkbox"
                name="pieces"
                value={piece.cle}
                checked={cochees.includes(piece.cle)}
                onChange={() => onToggle(piece.cle)}
                className="mt-0.5 rounded border-line focus-ring"
              />
              <span className="min-w-0">
                <span className="block text-ink truncate">{piece.nom}</span>
                <span className="block text-xs text-ink-faint">{piece.detail}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
