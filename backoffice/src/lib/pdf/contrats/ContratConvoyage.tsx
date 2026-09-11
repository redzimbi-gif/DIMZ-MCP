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

export function ContratConvoyageDocument({ dossierReference, client, entreprise, champs, dateSignature }: Props) {
  const clientNom = `${client?.prenom ?? ""} ${client?.nom ?? ""}`.trim() || "[●]";

  const blocks: LegalBlock[] = [
    { t: "h2", text: "Entre les soussignés" },
    { t: "field", label: "DIMZ — Mon Copilote Auto", value: cp(entreprise?.nom_dirigeant) },
    { t: "field", label: "Adresse professionnelle", value: cp(entreprise?.adresse) },
    { t: "field", label: "SIRET", value: cp(entreprise?.siret) },
    { t: "field", label: "Email", value: cp(entreprise?.email) },
    { t: "p", text: "Ci-après dénommé « DIMZ » ou « le Prestataire »," },
    { t: "p", text: "Et le Client :" },
    { t: "field", label: "Nom / Prénom", value: clientNom },
    { t: "field", label: "Adresse", value: cp(client?.adresse) },
    { t: "field", label: "Téléphone", value: cp(client?.telephone) },
    { t: "field", label: "Email", value: cp(client?.email) },
    { t: "p", text: "Ci-après dénommé « le Client ». Les parties conviennent de ce qui suit." },

    { t: "h2", n: 1, text: "L'esprit DIMZ" },
    { t: "p", text: "Chez DIMZ, notre rôle est simple : prendre le relais lorsque vous avez besoin de déplacer votre véhicule." },
    { t: "p", text: "Le Client confie à DIMZ une mission de convoyage du véhicule décrit dans le présent contrat, entre un lieu de départ et un lieu d'arrivée convenus." },
    { t: "p", text: "DIMZ intervient comme prestataire de service et ne devient pas propriétaire du véhicule." },

    { t: "h2", n: 2, text: "Véhicule concerné" },
    { t: "field", label: "Marque / Modèle", value: cp(champs.marque_modele) },
    { t: "field", label: "Immatriculation", value: cp(champs.immatriculation) },
    { t: "field", label: "Kilométrage au départ", value: cp(champs.km_depart) },
    { t: "field", label: "Lieu de départ", value: cp(champs.lieu_depart) },
    { t: "field", label: "Lieu d'arrivée", value: cp(champs.lieu_arrivee) },
    { t: "field", label: "Date prévue du convoyage", value: cp(champs.date_convoyage) },
    { t: "p", text: "Le véhicule est remis à DIMZ avec ses clés et les documents nécessaires à la réalisation de la mission." },
    { t: "p", text: "Un état du véhicule peut être réalisé avant et après le convoyage afin de constater son état apparent." },

    { t: "h2", n: 3, text: "Mission confiée à DIMZ" },
    { t: "p", text: "La prestation comprend :" },
    {
      t: "list",
      items: [
        "la prise en charge du véhicule au lieu convenu",
        "son déplacement jusqu'au lieu d'arrivée convenu",
        "la restitution du véhicule au Client ou à la personne désignée",
        "un contrôle visuel de l'état apparent du véhicule lors de la prise en charge et de la restitution",
      ],
    },
    { t: "p", text: "Sauf accord écrit contraire, la prestation ne comprend pas :" },
    { t: "list", items: ["les réparations mécaniques", "l'entretien du véhicule", "le nettoyage", "les frais de carburant ou de recharge non prévus au devis", "les péages ou frais particuliers non prévus dans le devis", "toute intervention mécanique sur le véhicule"] },

    { t: "h2", n: 4, text: "Obligations du Client" },
    { t: "p", text: "Le Client garantit que :" },
    {
      t: "list",
      items: [
        "il est autorisé à confier le véhicule à DIMZ",
        "le véhicule peut légalement circuler",
        "le véhicule dispose des documents obligatoires nécessaires à sa circulation",
        "les informations communiquées à DIMZ sont exactes",
        "le véhicule est assuré conformément aux obligations applicables",
      ],
    },
    { t: "p", text: "Le Client doit signaler avant le départ tout élément particulier concernant le véhicule : défaut mécanique connu, voyant allumé, problème de freinage, pneumatiques, batterie, recharge, antivol, particularité de démarrage, etc." },

    { t: "h2", n: 5, text: "Prix et paiement" },
    { t: "field", label: "Montant HT", value: champs.montant_ht ? `${champs.montant_ht} €` : "[●] €" },
    { t: "field", label: "TVA", value: champs.montant_tva ? `${champs.montant_tva} €` : "[●] €" },
    { t: "field", label: "Montant TTC", value: champs.montant_ttc ? `${champs.montant_ttc} €` : "[●] €" },
    { t: "p", text: "Le paiement intervient selon les modalités indiquées sur le devis ou la facture." },
    { t: "p", text: "Toute prestation supplémentaire demandée par le Client et non prévue initialement pourra faire l'objet d'une facturation complémentaire après accord du Client." },

    { t: "h2", n: 6, text: "Retard, modification ou annulation" },
    { t: "p", text: "Toute modification de l'adresse, de la date ou des conditions de prise en charge doit être communiquée à DIMZ dans les meilleurs délais." },
    { t: "p", text: "En cas d'impossibilité de réaliser le convoyage pour une raison indépendante de DIMZ, notamment conditions de circulation exceptionnelles, fermeture de route, panne préexistante ou impossibilité légale de circuler, DIMZ en informe le Client dans les meilleurs délais et recherche avec lui une solution adaptée." },
    { t: "p", text: "Les conditions d'annulation et les éventuels frais applicables sont ceux indiqués dans le devis accepté par le Client." },

    { t: "h2", n: 7, text: "Responsabilité" },
    { t: "p", text: "DIMZ s'engage à réaliser la prestation avec professionnalisme et diligence. DIMZ ne saurait être tenu responsable des dommages résultant :" },
    { t: "list", items: ["d'un défaut mécanique préexistant", "d'une information incomplète ou erronée communiquée par le Client", "d'un vice caché du véhicule", "d'un événement extérieur imprévisible ou irrésistible", "d'une immobilisation ou panne liée à l'état du véhicule"] },
    { t: "p", text: "En cas d'incident ou d'accident pendant le convoyage, DIMZ prend les mesures nécessaires à la sécurité des personnes et du véhicule et informe le Client dans les meilleurs délais." },

    { t: "h2", n: 8, text: "Carburant et recharge" },
    { t: "p", text: "Le véhicule doit disposer d'un niveau de carburant ou de charge suffisant pour permettre la réalisation de la mission." },
    { t: "p", text: "Lorsque cela est nécessaire, les frais de carburant ou de recharge sont pris en charge selon les modalités prévues au devis." },

    { t: "h2", n: 9, text: "Contraventions et frais liés à l'utilisation du véhicule" },
    { t: "p", text: "Les contraventions ou frais résultant d'une situation imputable au Client ou à l'état administratif du véhicule restent à la charge du Client." },
    { t: "p", text: "Les éventuels frais directement liés à une infraction commise par DIMZ dans le cadre de sa conduite restent à la charge de DIMZ, sous réserve des règles légales applicables." },

    { t: "h2", n: 10, text: "Restitution du véhicule" },
    { t: "p", text: "À l'arrivée, le véhicule est remis au Client ou à la personne préalablement désignée. Un contrôle visuel peut être effectué contradictoirement." },
    { t: "p", text: "Toute réserve concernant l'état apparent du véhicule doit, dans la mesure du possible, être signalée immédiatement lors de la restitution." },

    { t: "h2", n: 11, text: "Données personnelles" },
    { t: "p", text: "Les données communiquées par le Client sont utilisées uniquement dans le cadre de la gestion de la prestation, de la facturation et du suivi de la relation commerciale." },
    { t: "p", text: "DIMZ s'engage à traiter ces données conformément à la réglementation applicable en matière de protection des données personnelles." },

    { t: "h2", n: 12, text: "Réclamation" },
    { t: "p", text: "Toute réclamation concernant la prestation doit être adressée à DIMZ dans les meilleurs délais à l'adresse indiquée sur la facture ou le devis." },
    { t: "p", text: "DIMZ s'engage à examiner chaque réclamation avec attention et à rechercher une solution équitable lorsque cela est possible." },

    { t: "h2", n: 13, text: "Acceptation" },
    { t: "p", text: "Le Client reconnaît avoir pris connaissance du présent contrat, du devis associé et des conditions applicables à la prestation." },
    { t: "p", text: "La signature du présent contrat vaut acceptation de l'ensemble de ses dispositions." },
  ];

  return (
    <Document title={`Contrat de convoyage — ${dossierReference}`}>
      <Page size="A4" style={pdfStyles.page}>
        <LegalHeader docTitle="Contrat de prestation de convoyage" dossierReference={dossierReference} />
        <Text style={legalStyles.title}>Contrat de prestation de convoyage</Text>
        <Text style={legalStyles.subtitle}>
          {dossierReference} — {clientNom}
        </Text>
        <LegalBody blocks={blocks} />
        <SignatureBlock ville={entreprise?.ville || "Lyon"} date={dateSignature} clientNom={clientNom} dimzNom={cp(entreprise?.nom_dirigeant)} />
        <PdfFooter entreprise={entreprise} />
      </Page>
    </Document>
  );
}
