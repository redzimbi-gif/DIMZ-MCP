import { Document, Page, Text } from "@react-pdf/renderer";
import { pdfStyles } from "../theme";
import { PdfFooter } from "../PdfHeader";
import { LegalHeader, LegalBody, SignatureBlock, legalStyles, type LegalBlock } from "./shared";
import type { Client, EntrepriseInfo } from "@/lib/types";

interface Props {
  dossierReference: string;
  client: Client | null | undefined;
  entreprise: EntrepriseInfo | null;
  champs: Record<string, string>;
  dateSignature: string;
}

const cp = (v: string | null | undefined) => v || "[À COMPLÉTER]";

export function ContratCopiloteDocument({ dossierReference, client, entreprise, champs, dateSignature }: Props) {
  const clientNom = `${client?.prenom ?? ""} ${client?.nom ?? ""}`.trim() || "[●]";
  const montant = champs.montant ? `${champs.montant} € TTC` : "[99 € ou 149 € TTC]";

  const blocks: LegalBlock[] = [
    { t: "h2", text: "Entre les soussignés" },
    { t: "field", label: "DIMZ — Mon Copilote Auto", value: cp(entreprise?.nom_dirigeant) },
    { t: "field", label: "Adresse professionnelle", value: cp(entreprise?.adresse) },
    { t: "field", label: "SIRET", value: cp(entreprise?.siret) },
    { t: "field", label: "E-mail", value: cp(entreprise?.email) },
    { t: "p", text: "Ci-après dénommé « DIMZ »," },
    { t: "p", text: "Et le Client :" },
    { t: "field", label: "Nom / Prénom", value: clientNom },
    { t: "field", label: "Adresse", value: cp(client?.adresse) },
    { t: "field", label: "Téléphone", value: cp(client?.telephone) },
    { t: "field", label: "Email", value: cp(client?.email) },
    { t: "p", text: "Ci-après dénommé « le Client »." },

    { t: "h2", n: 1, text: "Bienvenue à bord" },
    { t: "p", text: "Acheter une voiture peut vite devenir compliqué : annonces, prix, équipements, historique, négociation…" },
    { t: "p", text: "Avec l'offre Copilote, DIMZ accompagne le Client dans sa recherche afin de lui permettre de prendre une décision plus éclairée." },
    { t: "p", text: "DIMZ conseille, oriente et accompagne. Le Client reste décisionnaire de son achat." },

    { t: "h2", n: 2, text: "Objet de la prestation" },
    { t: "p", text: "Le Client confie à DIMZ une mission d'accompagnement dans la recherche et la sélection d'un véhicule correspondant à ses critères." },
    { t: "p", text: "La prestation peut notamment comprendre :" },
    {
      t: "list",
      items: [
        "l'analyse du besoin du Client",
        "la définition des critères de recherche",
        "l'analyse du budget",
        "la recherche de véhicules correspondant aux critères",
        "la sélection d'annonces pertinentes",
        "l'analyse comparative des véhicules sélectionnés",
        "des recommandations sur le prix et la pertinence de l'offre",
        "des conseils sur les équipements, motorisations et caractéristiques",
        "un accompagnement dans la prise de décision",
      ],
    },

    { t: "h2", n: 3, text: "Ce que DIMZ ne fait pas" },
    { t: "p", text: "DIMZ agit en qualité de conseil et d'accompagnement. DIMZ n'est pas :" },
    {
      t: "list",
      items: [
        "le vendeur du véhicule",
        "le propriétaire du véhicule",
        "le garant de l'état mécanique du véhicule",
        "le fabricant du véhicule",
        "le financeur de l'achat",
      ],
    },
    { t: "p", text: "Sauf prestation complémentaire expressément prévue, DIMZ ne réalise pas lui-même une expertise mécanique complète du véhicule." },
    { t: "p", text: "Lorsque cela est pertinent, DIMZ peut recommander au Client de faire appel à un professionnel qualifié pour réaliser une inspection ou une expertise." },

    { t: "h2", n: 4, text: "Choix final du véhicule" },
    { t: "p", text: "Le Client conserve la liberté de choisir ou de refuser tout véhicule proposé." },
    { t: "p", text: "Les recommandations de DIMZ constituent des avis professionnels fondés sur les informations disponibles au moment de l'analyse." },
    { t: "p", text: "Le Client reste seul décisionnaire de l'achat et signe directement avec le vendeur du véhicule." },

    { t: "h2", n: 5, text: "Prix de la prestation" },
    { t: "field", label: "Montant de la prestation", value: montant },
    { t: "p", text: "Le montant exact applicable est précisé dans le devis ou la commande. Le règlement intervient selon les modalités indiquées lors de la commande." },

    { t: "h2", n: 6, text: "Limites des informations disponibles" },
    { t: "p", text: "DIMZ analyse les informations accessibles concernant les véhicules proposés." },
    { t: "p", text: "Toutefois, les informations figurant dans une annonce ou communiquées par un vendeur peuvent être incomplètes, erronées ou évoluer." },
    { t: "p", text: "DIMZ ne peut garantir l'exactitude absolue des informations communiquées par un tiers." },
    { t: "p", text: "Le Client est invité à vérifier les éléments essentiels auprès du vendeur avant toute acquisition." },

    { t: "h2", n: 7, text: "Relation avec le vendeur" },
    { t: "p", text: "DIMZ peut accompagner le Client dans ses échanges avec le vendeur lorsque cela est prévu dans la prestation." },
    { t: "p", text: "Sauf mandat ou prestation complémentaire clairement établi, DIMZ ne conclut pas la vente au nom et pour le compte du Client." },
    { t: "p", text: "Le contrat de vente est conclu directement entre le Client et le vendeur." },

    { t: "h2", n: 8, text: "Annulation" },
    { t: "p", text: "Les conditions d'annulation applicables sont précisées dans les conditions commerciales communiquées au Client avant la commande." },
    { t: "p", text: "Lorsque la prestation a commencé à la demande expresse du Client avant la fin du délai légal de rétractation, les conséquences de cette demande sont celles prévues par la réglementation applicable." },

    { t: "h2", n: 9, text: "Responsabilité" },
    { t: "p", text: "DIMZ met en œuvre les moyens nécessaires pour fournir un accompagnement sérieux et professionnel." },
    {
      t: "p",
      text: "La responsabilité de DIMZ ne saurait être engagée du seul fait que le Client décide finalement d'acheter un véhicule qui s'avère ultérieurement présenter un défaut non détectable à partir des informations disponibles ou nécessitant une expertise mécanique.",
    },
    { t: "p", text: "DIMZ recommande systématiquement une vérification adaptée au niveau de risque du véhicule avant l'achat." },

    { t: "h2", n: 10, text: "Données personnelles" },
    { t: "p", text: "Les données du Client sont utilisées pour assurer la prestation, communiquer avec lui, établir les documents commerciaux et assurer le suivi de la relation." },
    { t: "p", text: "DIMZ traite ces données conformément à la réglementation applicable." },

    { t: "h2", n: 11, text: "Fin de la prestation" },
    { t: "p", text: "La prestation Copilote prend fin lorsque les services prévus dans l'offre ont été réalisés." },
    { t: "p", text: "Toute demande supplémentaire pourra faire l'objet d'une prestation complémentaire et d'un devis spécifique." },

    { t: "h2", n: 12, text: "Acceptation" },
    { t: "p", text: "Le Client reconnaît avoir compris que DIMZ est son copilote, et non le vendeur du véhicule." },
    { t: "p", text: "Il reconnaît également conserver l'entière décision concernant l'achat du véhicule." },
  ];

  return (
    <Document title={`Contrat Copilote — ${dossierReference}`}>
      <Page size="A4" style={pdfStyles.page}>
        <LegalHeader docTitle="Contrat de prestation — Offre Copilote" dossierReference={dossierReference} />
        <Text style={legalStyles.title}>Contrat de prestation — Offre Copilote</Text>
        <Text style={legalStyles.subtitle}>
          {dossierReference} — {clientNom}
        </Text>
        <LegalBody blocks={blocks} />
        <SignatureBlock ville={entreprise?.ville || "Lyon"} date={dateSignature} clientNom={clientNom} dimzNom={cp(entreprise?.nom_dirigeant)} />
        <PdfFooter />
      </Page>
    </Document>
  );
}
