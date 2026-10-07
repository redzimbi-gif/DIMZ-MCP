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

export function ContratInspectionDocument({ dossierReference, client, entreprise, champs, dateSignature }: Props) {
  const clientNom = `${client?.prenom ?? ""} ${client?.nom ?? ""}`.trim() || "[●]";

  const blocks: LegalBlock[] = [
    { t: "h2", text: "Entre" },
    { t: "field", label: "DIMZ — Mon Copilote Auto", value: cp(entreprise?.nom_dirigeant) },
    { t: "field", label: "SIRET", value: cp(entreprise?.siret) },
    { t: "field", label: "Adresse", value: cp(entreprise?.adresse) },
    { t: "field", label: "E-mail", value: cp(entreprise?.email) },
    { t: "p", text: "Et le Client :" },
    { t: "field", label: "Nom / Prénom", value: clientNom },
    { t: "field", label: "Adresse", value: cp(client?.adresse) },
    { t: "field", label: "Téléphone", value: cp(client?.telephone) },
    { t: "field", label: "Email", value: cp(client?.email) },

    { t: "h2", n: 1, text: "La mission" },
    { t: "p", text: "Le Client confie à DIMZ une mission d'inspection automobile destinée à l'aider à apprécier l'état apparent d'un véhicule avant son achat ou dans le cadre de son suivi." },
    { t: "p", text: "L'objectif est simple : Regarder la voiture comme si elle était la nôtre et signaler ce qui mérite notre attention." },
    { t: "p", text: "L'inspection constitue une aide à la décision. Elle ne constitue pas, sauf mention expresse contraire, une expertise automobile au sens d'une expertise réalisée par un expert automobile qualifié." },

    { t: "h2", n: 2, text: "Véhicule inspecté" },
    { t: "field", label: "Marque", value: cp(champs.marque) },
    { t: "field", label: "Modèle", value: cp(champs.modele) },
    { t: "field", label: "Version", value: cp(champs.version) },
    { t: "field", label: "Immatriculation", value: cp(champs.immatriculation) },
    { t: "field", label: "VIN", value: cp(champs.vin) },
    { t: "field", label: "Kilométrage affiché", value: cp(champs.kilometrage) },
    { t: "field", label: "Lieu de l'inspection", value: cp(champs.lieu) },
    { t: "field", label: "Date", value: cp(champs.date_inspection) },
    { t: "field", label: "Vendeur", value: cp(champs.vendeur) },

    { t: "h2", n: 3, text: "Contenu de l'inspection" },
    { t: "p", text: "Selon la formule choisie, DIMZ peut notamment effectuer :" },
    { t: "h2", text: "Extérieur" },
    { t: "list", items: ["carrosserie", "peinture", "éléments de carrosserie", "vitrages", "optiques", "jantes", "pneumatiques", "signes visibles de choc ou de réparation", "cohérence générale de l'état extérieur"] },
    { t: "h2", text: "Intérieur" },
    { t: "list", items: ["sièges", "garnitures", "tableau de bord", "commandes", "équipements visibles", "climatisation/chauffage", "système multimédia", "éléments électriques accessibles"] },
    { t: "h2", text: "Compartiment moteur" },
    { t: "p", text: "Lorsque cela est possible sans démontage :" },
    { t: "list", items: ["niveaux accessibles", "traces visibles de fuite", "état apparent des éléments accessibles", "bruits ou comportements inhabituels observables"] },
    { t: "h2", text: "Partie mécanique" },
    { t: "p", text: "Lorsque les conditions permettent un essai :" },
    { t: "list", items: ["démarrage", "fonctionnement apparent du moteur", "boîte de vitesses", "embrayage", "freinage", "direction", "comportement général du véhicule"] },
    { t: "h2", text: "Essai routier" },
    { t: "p", text: "Un essai routier peut être réalisé uniquement lorsque :" },
    { t: "list", items: ["le véhicule est légalement autorisé à circuler", "les conditions de sécurité le permettent", "le vendeur ou propriétaire autorise l'essai", "l'assurance applicable permet cet usage"] },
    { t: "p", text: "L'essai routier peut être exclu lorsque les conditions de sécurité ne sont pas réunies." },

    { t: "h2", n: 4, text: "Ce que l'inspection ne comprend pas" },
    { t: "p", text: "Sauf mention expresse dans le devis, DIMZ ne réalise pas :" },
    {
      t: "list",
      items: [
        "de démontage mécanique",
        "de démontage de pièces",
        "d'ouverture du moteur ou de la boîte de vitesses",
        "de mesure de compression",
        "d'analyse d'huile ou de liquide",
        "de diagnostic électronique approfondi",
        "de contrôle structurel nécessitant du matériel spécialisé",
        "d'expertise accidentologique",
        "de certification de l'état du véhicule",
        "de garantie d'absence de panne future",
      ],
    },
    { t: "p", text: "Lorsque cela est nécessaire, DIMZ peut recommander au Client une expertise ou un diagnostic réalisé par un professionnel spécialisé." },

    { t: "h2", n: 5, text: "Rapport d'inspection" },
    { t: "p", text: "À l'issue de la mission, DIMZ peut remettre au Client un rapport comprenant notamment :" },
    { t: "list", items: ["les éléments observés", "les photographies réalisées", "les anomalies visibles", "les points de vigilance", "les éléments positifs constatés", "les recommandations de DIMZ"] },
    { t: "p", text: "Le rapport reflète l'état apparent du véhicule au moment de l'inspection. Il ne constitue pas une garantie sur l'état futur du véhicule." },

    { t: "h2", n: 6, text: "Informations fournies par le vendeur" },
    { t: "p", text: "Le Client reconnaît que certaines informations peuvent provenir du vendeur." },
    { t: "p", text: "DIMZ peut les relever et les analyser, mais ne peut garantir leur exactitude lorsqu'elles ne peuvent être vérifiées directement." },
    { t: "p", text: "Toute incohérence identifiée est signalée au Client dans le rapport lorsque cela est possible." },

    { t: "h2", n: 7, text: "Véhicule inaccessible ou inspection impossible" },
    { t: "p", text: "Si DIMZ se déplace et ne peut pas réaliser l'inspection pour une raison indépendante de sa volonté, notamment :" },
    { t: "list", items: ["vendeur absent", "véhicule indisponible", "véhicule vendu", "accès refusé", "véhicule non conforme aux informations communiquées", "conditions de sécurité insuffisantes"] },
    { t: "p", text: "DIMZ en informe le Client. Les frais de déplacement éventuellement engagés peuvent rester dus lorsqu'ils sont prévus dans le devis." },

    { t: "h2", n: 8, text: "Prix" },
    { t: "field", label: "Prix de l'inspection", value: champs.prix ? `${champs.prix} € TTC` : "[●] € TTC" },
    { t: "field", label: "Frais supplémentaires éventuels", value: champs.frais_supplementaires ? `${champs.frais_supplementaires} € TTC` : "[●] € TTC" },
    { t: "p", text: "Le prix est indiqué avant validation de la prestation." },

    { t: "h2", n: 9, text: "Responsabilité" },
    { t: "p", text: "DIMZ s'engage à effectuer l'inspection avec sérieux et diligence." },
    { t: "p", text: "La responsabilité de DIMZ est limitée aux éléments qu'il était raisonnablement possible d'observer dans les conditions de la mission. DIMZ ne peut être tenu responsable d'un défaut :" },
    { t: "list", items: ["invisible sans démontage", "intermittent", "électronique non détectable lors de l'inspection", "dissimulé par un tiers", "apparu après l'inspection", "nécessitant un matériel ou une expertise spécialisée non prévu dans la mission"] },

    { t: "h2", n: 10, text: "Décision d'achat" },
    { t: "p", text: "Le Client reste seul décisionnaire de l'achat." },
    { t: "p", text: "Le rapport d'inspection constitue un outil d'aide à la décision et ne constitue pas une recommandation juridiquement contraignante d'acheter ou de ne pas acheter le véhicule." },
    { t: "p", text: "Lorsque DIMZ identifie un risque important, il s'engage à le signaler clairement au Client." },

    { t: "h2", n: 11, text: "Droit de rétractation" },
    { t: "p", text: "Lorsque le droit légal de rétractation est applicable, le Client dispose des droits prévus par les CGV DIMZ." },
    { t: "p", text: "Si le Client demande expressément que l'inspection commence avant l'expiration du délai légal de rétractation, il reconnaît les conséquences prévues par la réglementation applicable." },

    { t: "h2", n: 12, text: "Acceptation" },
    { t: "p", text: "Le Client reconnaît avoir compris la nature et les limites de l'inspection." },
    { t: "p", text: "Il reconnaît notamment qu'une inspection DIMZ ne remplace pas une expertise automobile ou un diagnostic mécanique approfondi lorsqu'un tel examen est nécessaire." },
  ];

  return (
    <Document title={`Contrat d'inspection — ${dossierReference}`}>
      <Page size="A4" style={pdfStyles.page}>
        <LegalHeader docTitle="Contrat d'inspection automobile" dossierReference={dossierReference} />
        <Text style={legalStyles.title}>Contrat d'inspection automobile</Text>
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
