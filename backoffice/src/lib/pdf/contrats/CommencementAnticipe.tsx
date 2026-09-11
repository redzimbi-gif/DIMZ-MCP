import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "../theme";
import { PdfFooter } from "../PdfHeader";
import { LegalHeader, LegalBody, legalStyles, type LegalBlock } from "./shared";
import type { Client, EntrepriseInfo } from "@/lib/types";

interface Props {
  dossierReference: string;
  client: Client | null | undefined;
  entreprise: EntrepriseInfo | null;
  champs: Record<string, string>;
  date: string;
}

const cp = (v: string | undefined | null) => v || "[À COMPLÉTER]";

export function CommencementAnticipeDocument({ dossierReference, client, entreprise, champs, date }: Props) {
  const clientNom = `${client?.prenom ?? ""} ${client?.nom ?? ""}`.trim() || "[●]";

  const blocks: LegalBlock[] = [
    { t: "h2", text: "Client" },
    { t: "field", label: "Nom / Prénom", value: clientNom },
    { t: "field", label: "Adresse", value: cp(client?.adresse) },
    { t: "field", label: "E-mail", value: cp(client?.email) },
    { t: "field", label: "Téléphone", value: cp(client?.telephone) },
    { t: "field", label: "Prestation concernée", value: cp(champs.prestation) },
    { t: "field", label: "Référence de commande / devis", value: cp(champs.reference_commande) },

    { t: "h2", text: "Votre demande" },
    { t: "p", text: "Lorsque le contrat est conclu à distance, le Client consommateur dispose, lorsque le droit de rétractation est applicable, d'un délai légal de 14 jours." },
    { t: "p", text: "Si vous souhaitez que DIMZ commence l'exécution de votre prestation avant l'expiration de ce délai, vous devez en faire la demande expresse ci-dessous." },
    { t: "p", text: "Je demande expressément à DIMZ :" },
    { t: "list", items: ["de commencer l'exécution de ma prestation avant la fin du délai légal de rétractation."] },
    { t: "p", text: "Je reconnais avoir été informé que :" },
    {
      t: "list",
      items: [
        "la prestation peut commencer avant la fin du délai de rétractation à ma demande ;",
        "si j'exerce mon droit de rétractation avant la fin du délai, je pourrai être redevable du montant correspondant aux services déjà réalisés jusqu'à la date de ma demande de rétractation, conformément à la réglementation applicable ;",
        "lorsque la prestation est entièrement exécutée avant la fin du délai de rétractation, les règles légales relatives à la perte du droit de rétractation s'appliquent lorsque les conditions prévues par la loi sont réunies.",
      ],
    },
  ];

  return (
    <Document title={`Demande de commencement anticipé — ${dossierReference}`}>
      <Page size="A4" style={pdfStyles.page}>
        <LegalHeader docTitle="Demande expresse de commencement de la prestation" dossierReference={dossierReference} />
        <Text style={legalStyles.title}>Demande expresse de commencement de la prestation</Text>
        <Text style={legalStyles.subtitle}>
          {dossierReference} — {clientNom}
        </Text>
        <LegalBody blocks={blocks} />

        <View style={pdfStyles.signatureBox} wrap={false}>
          <Text style={legalStyles.p}>Date : {date}</Text>
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 6 }}>Nom du Client : {clientNom}</Text>
          <Text style={{ fontSize: 8.5, color: "#8a909c", marginTop: 12 }}>Signature :</Text>
        </View>

        <View style={{ marginTop: 24, borderTop: "1px solid #e6e8ee", paddingTop: 14 }} wrap={false}>
          <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", marginBottom: 6 }}>DIMZ — Mon Copilote Auto</Text>
          <Text style={legalStyles.p}>Votre copilote peut commencer à travailler dès maintenant, à votre demande.</Text>
          <Text style={{ fontSize: 8.5, color: "#565c68", marginTop: 4 }}>E-mail : {cp(entreprise?.email)}</Text>
          <Text style={{ fontSize: 8.5, color: "#565c68" }}>Téléphone : {cp(entreprise?.telephone)}</Text>
          <Text style={{ fontSize: 8.5, color: "#8a909c", marginTop: 10 }}>Date : {date}</Text>
          <Text style={{ fontSize: 8.5, color: "#8a909c" }}>Signature du Client :</Text>
        </View>

        <Text style={{ fontSize: 8, color: "#8a909c", marginTop: 16 }}>
          À envoyer à : {cp(entreprise?.email)}
        </Text>

        <PdfFooter entreprise={entreprise} />
      </Page>
    </Document>
  );
}
