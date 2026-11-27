import { Document, Page, Text } from "@react-pdf/renderer";
import { pdfStyles } from "../theme";
import { PdfFooter } from "../PdfHeader";
import { LegalHeader, LegalBody, legalStyles, type LegalBlock } from "./shared";
import type { Client, EntrepriseInfo } from "@/lib/types";

interface Props {
  dossierReference: string;
  client: Client | null | undefined;
  entreprise: EntrepriseInfo | null;
  champs: Record<string, string>;
}

const cp = (v: string | undefined | null) => v || "[À COMPLÉTER]";

export function RetractationDocument({ dossierReference, client, entreprise, champs }: Props) {
  const clientNom = `${client?.prenom ?? ""} ${client?.nom ?? ""}`.trim() || "[●]";

  const blocks: LegalBlock[] = [
    { t: "h2", text: "À l'attention de" },
    { t: "field", label: "DIMZ — Mon Copilote Auto", value: cp(entreprise?.nom_dirigeant) },
    { t: "field", label: "Adresse professionnelle", value: cp(entreprise?.adresse) },
    { t: "field", label: "E-mail", value: cp(entreprise?.email) },
    { t: "field", label: "Téléphone", value: cp(entreprise?.telephone) },
    { t: "divider" },

    { t: "h2", text: "Vous souhaitez vous rétracter ?" },
    { t: "p", text: "Vous pouvez utiliser ce formulaire lorsque vous souhaitez exercer votre droit légal de rétractation, lorsque celui-ci est applicable à votre contrat." },
    { t: "p", text: "Je vous notifie par la présente ma décision de me rétracter du contrat portant sur la prestation suivante :" },
    { t: "field", label: "Prestation", value: cp(champs.prestation) },
    { t: "field", label: "Référence du devis / commande", value: cp(champs.reference_commande) },
    { t: "field", label: "Date de commande", value: cp(champs.date_commande) },
    { t: "field", label: "Date de conclusion du contrat", value: cp(champs.date_conclusion) },
    { t: "divider" },

    { t: "h2", text: "Coordonnées du Client" },
    { t: "field", label: "Nom / Prénom", value: clientNom },
    { t: "field", label: "Adresse", value: cp(client?.adresse) },
  ];

  return (
    <Document title={`Formulaire de rétractation — ${dossierReference}`}>
      <Page size="A4" style={pdfStyles.page}>
        <LegalHeader docTitle="Formulaire de rétractation" dossierReference={dossierReference} />
        <Text style={legalStyles.title}>Formulaire de rétractation</Text>
        <Text style={legalStyles.subtitle}>
          DIMZ — Mon Copilote Auto · {dossierReference} — {clientNom}
        </Text>
        <LegalBody blocks={blocks} />
        <PdfFooter entreprise={entreprise} />
      </Page>
    </Document>
  );
}
