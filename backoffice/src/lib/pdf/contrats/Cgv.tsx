import { Document, Page, Text } from "@react-pdf/renderer";
import { pdfStyles } from "../theme";
import { PdfFooter } from "../PdfHeader";
import { LegalHeader, LegalBody, legalStyles, type LegalBlock } from "./shared";
import type { EntrepriseInfo } from "@/lib/types";

interface Props {
  dossierReference: string;
  entreprise: EntrepriseInfo | null;
  dateGeneration: string;
}

const cp = (v: string | null | undefined) => v || "[À COMPLÉTER]";

export function CgvDocument({ dossierReference, entreprise, dateGeneration }: Props) {
  const blocks: LegalBlock[] = [
    { t: "h2", n: 1, text: "Qui est DIMZ ?" },
    {
      t: "p",
      text: "Les présentes Conditions Générales de Vente et de Prestation de Services (ci-après les « CGV ») sont proposées par :",
    },
    { t: "field", label: "Nom / prénom", value: cp(entreprise?.nom_dirigeant) },
    { t: "field", label: "Statut", value: "Entrepreneur individuel / Micro-entrepreneur" },
    { t: "field", label: "SIRET", value: cp(entreprise?.siret) },
    { t: "field", label: "Adresse professionnelle", value: cp(entreprise?.adresse) },
    { t: "field", label: "E-mail", value: cp(entreprise?.email) },
    { t: "field", label: "Téléphone", value: cp(entreprise?.telephone) },
    {
      t: "p",
      text: "Ci-après désigné « DIMZ ». Les présentes CGV s'appliquent aux prestations proposées par DIMZ auprès de clients particuliers et, lorsque cela est précisé, de clients professionnels.",
    },

    { t: "h2", n: 2, text: "L'esprit DIMZ" },
    { t: "p", text: "DIMZ est un service d'accompagnement automobile. Notre rôle est d'aider le Client à :" },
    { t: "p", text: "Trouver. Sécuriser. Accompagner. Livrer." },
    { t: "p", text: "DIMZ intervient comme copilote du Client. DIMZ conseille, recherche, analyse, alerte et accompagne." },
    {
      t: "p",
      text: "Sauf mention contraire dans un contrat particulier, DIMZ n'est pas le vendeur du véhicule et ne devient pas propriétaire du véhicule recherché ou acheté par le Client.",
    },

    { t: "h2", n: 3, text: "Champ d'application" },
    { t: "p", text: "Les présentes CGV s'appliquent à l'ensemble des prestations proposées par DIMZ, notamment :" },
    { t: "list", items: ["Convoyage", "Copilote", "Copilote Plus", "Inspection automobile", "toute prestation complémentaire faisant l'objet d'un devis"] },
    {
      t: "p",
      text: "Le contrat conclu avec le Client est constitué des présentes CGV, du devis ou bon de commande et, lorsque cela est prévu, du contrat spécifique à la prestation. En cas de contradiction, les conditions particulières du devis ou du contrat spécifique prévalent sur les présentes CGV.",
    },

    { t: "h2", n: 4, text: "Devis et commande" },
    { t: "p", text: "Lorsque la prestation nécessite un devis, celui-ci précise notamment :" },
    {
      t: "list",
      items: [
        "la nature de la prestation",
        "son périmètre",
        "son prix TTC",
        "les éventuels frais supplémentaires",
        "les modalités de paiement",
        "le délai ou la période prévisionnelle d'exécution",
        "la durée de validité du devis",
      ],
    },
    {
      t: "p",
      text: "Le devis accepté constitue un engagement contractuel entre les parties. Le Client reconnaît avoir reçu les informations nécessaires lui permettant de comprendre la nature et le prix de la prestation avant de commander.",
    },

    { t: "h2", n: 5, text: "Prix" },
    { t: "p", text: "Les prix destinés aux consommateurs sont indiqués en euros TTC." },
    { t: "p", text: "Lorsque le prix ne peut être déterminé précisément à l'avance, DIMZ indique le mode de calcul ou établit un devis." },
    {
      t: "p",
      text: "Toute prestation ou dépense supplémentaire non prévue initialement doit, lorsque cela est possible, faire l'objet d'un accord préalable du Client. Les frais engagés pour le compte du Client ne sont pas inclus dans le prix de la prestation sauf mention contraire.",
    },

    { t: "h2", n: 6, text: "Paiement" },
    { t: "p", text: "Sauf conditions particulières prévues au devis :" },
    {
      t: "list",
      items: [
        "Les prestations sont payables avant leur commencement.",
        "Le règlement peut être effectué par les moyens de paiement proposés par DIMZ.",
        "Une prestation peut ne pas commencer tant que le règlement prévu n'a pas été reçu.",
      ],
    },
    {
      t: "p",
      text: "En cas de retard de paiement par un client professionnel, les pénalités de retard et l'indemnité forfaitaire pour frais de recouvrement prévues par la réglementation sont applicables.",
    },

    { t: "h2", n: 7, text: "Exécution des prestations" },
    { t: "p", text: "DIMZ s'engage à réaliser les prestations convenues avec sérieux, diligence et professionnalisme." },
    { t: "p", text: "Les délais communiqués au Client sont, sauf engagement contraire écrit, des délais prévisionnels." },
    {
      t: "p",
      text: "La réalisation d'une prestation peut dépendre de tiers : vendeur automobile, garage, expert, transporteur, administration, organisme financier ou toute autre personne intervenant dans le dossier.",
    },
    { t: "p", text: "DIMZ informe le Client des difficultés importantes dont il a connaissance et recherche, lorsque cela est possible, une solution adaptée." },

    { t: "h2", n: 8, text: "Véhicules et informations fournies par des tiers" },
    {
      t: "p",
      text: "Les informations concernant un véhicule peuvent provenir du Client, d'un vendeur, d'une plateforme d'annonces, d'un garage, d'un constructeur, d'un rapport historique ou d'un autre tiers.",
    },
    { t: "p", text: "DIMZ peut analyser ces informations mais ne peut garantir l'exactitude absolue d'une information fournie par un tiers." },
    { t: "p", text: "Lorsque la nature du véhicule ou de la mission le justifie, DIMZ peut recommander une inspection mécanique ou technique réalisée par un professionnel compétent." },

    { t: "h2", n: 9, text: "DIMZ n'est pas le vendeur" },
    { t: "p", text: "Sauf contrat spécifique contraire, DIMZ ne vend pas le véhicule au Client. Le contrat de vente du véhicule est conclu entre le Client et le vendeur." },
    { t: "p", text: "DIMZ ne peut être tenu responsable des obligations propres au vendeur, notamment concernant :" },
    {
      t: "list",
      items: [
        "la conformité du véhicule",
        "les garanties légales ou commerciales du vendeur",
        "les défauts non détectables dans le cadre de la prestation",
        "les informations volontairement fausses ou dissimulées par un tiers",
      ],
    },
    { t: "p", text: "Cette disposition ne limite pas la responsabilité propre de DIMZ concernant les prestations qu'il réalise directement." },

    { t: "h2", n: 10, text: "Responsabilité" },
    { t: "p", text: "DIMZ est responsable de la bonne exécution des obligations qui lui incombent au titre du contrat." },
    { t: "p", text: "DIMZ ne saurait être responsable d'un dommage résultant exclusivement :" },
    {
      t: "list",
      items: [
        "d'une information erronée communiquée par le Client ou un tiers",
        "d'un défaut préexistant non détectable",
        "d'un vice caché",
        "d'une panne ultérieure du véhicule",
        "d'une décision prise librement par le Client malgré une recommandation contraire de DIMZ",
        "d'un événement extérieur répondant aux conditions légales de la force majeure",
      ],
    },
    { t: "p", text: "Les éventuelles limitations de responsabilité spécifiques au convoyage ou à l'inspection sont précisées dans les contrats correspondants." },

    { t: "h2", n: 11, text: "Droit de rétractation" },
    {
      t: "p",
      text: "Lorsque le Client est un consommateur et que le contrat est conclu à distance ou hors établissement, il bénéficie, lorsqu'il est applicable, d'un délai légal de rétractation de 14 jours à compter de la conclusion du contrat pour une prestation de services.",
    },
    { t: "p", text: "Le Client peut exercer ce droit en adressant à DIMZ une déclaration claire exprimant sa volonté de se rétracter ou en utilisant le formulaire type annexé aux présentes CGV." },
    { t: "p", text: "Lorsque le Client demande expressément que l'exécution de la prestation commence avant la fin du délai de rétractation, DIMZ peut commencer la prestation avant l'expiration de ce délai." },
    {
      t: "p",
      text: "Dans ce cas, si le Client exerce son droit de rétractation avant la fin du délai, il reste redevable du montant correspondant au service effectivement exécuté jusqu'à la communication de sa décision de rétractation, dans les conditions prévues par la réglementation.",
    },
    {
      t: "p",
      text: "Lorsque la prestation a été entièrement exécutée avant la fin du délai de rétractation, après demande expresse du Client et renoncement exprès à son droit de rétractation lorsque cette renonciation est légalement requise, le droit de rétractation ne peut plus être exercé.",
    },
    { t: "p", text: "Certaines prestations, notamment certains services de transport fournis à une date ou période déterminée, peuvent être soumises à des règles spécifiques. DIMZ précisera ces modalités dans le contrat concerné." },

    { t: "h2", n: 12, text: "Annulation" },
    { t: "p", text: "En dehors du droit légal de rétractation, les conditions d'annulation sont celles indiquées dans le devis ou le contrat particulier." },
    { t: "p", text: "Lorsqu'une prestation implique l'engagement de frais auprès d'un tiers à la demande du Client, ces frais peuvent rester dus lorsqu'ils ne sont pas récupérables." },

    { t: "h2", n: 13, text: "Réclamation" },
    { t: "p", text: "Toute réclamation doit être adressée en priorité à DIMZ par écrit :" },
    { t: "field", label: "E-mail", value: cp(entreprise?.email) },
    { t: "p", text: "DIMZ s'engage à examiner la réclamation et à rechercher une solution amiable. Le Client est invité à conserver les échanges et documents relatifs à sa demande." },

    { t: "h2", n: 14, text: "Médiation de la consommation" },
    { t: "p", text: "Conformément à la réglementation applicable, DIMZ permet au consommateur d'accéder gratuitement à un dispositif de médiation de la consommation." },
    { t: "p", text: "Après avoir préalablement adressé une réclamation écrite à DIMZ et en l'absence de solution satisfaisante, le Client consommateur peut saisir le médiateur dont DIMZ relève." },
    { t: "field", label: "Médiateur de la consommation désigné", value: cp(entreprise?.mediateur_nom) },
    { t: "field", label: "Adresse", value: cp(entreprise?.mediateur_adresse) },
    { t: "field", label: "Site internet", value: cp(entreprise?.mediateur_site) },
    { t: "p", text: "Ces informations devront également être affichées sur le site internet et les documents commerciaux de DIMZ." },

    { t: "h2", n: 15, text: "Données personnelles" },
    { t: "p", text: "DIMZ collecte et traite les données personnelles nécessaires à la gestion des prestations, à la relation commerciale, à la facturation et au suivi des dossiers." },
    { t: "p", text: "Les modalités détaillées de traitement des données sont précisées dans la Politique de confidentialité de DIMZ." },

    { t: "h2", n: 16, text: "Propriété intellectuelle" },
    { t: "p", text: "Les documents, analyses, recommandations, contenus, supports et éléments créés par DIMZ dans le cadre de son activité restent, sauf accord contraire, la propriété de DIMZ." },
    { t: "p", text: "Ils sont destinés à l'usage du Client dans le cadre de la prestation. Toute reproduction ou exploitation commerciale sans autorisation préalable est interdite." },

    { t: "h2", n: 17, text: "Force majeure" },
    { t: "p", text: "DIMZ ne pourra être tenu responsable d'un retard ou d'une inexécution résultant d'un événement répondant aux conditions légales de la force majeure." },
    { t: "p", text: "DIMZ informera le Client dans les meilleurs délais lorsqu'un tel événement affecte la prestation." },

    { t: "h2", n: 18, text: "Droit applicable" },
    { t: "p", text: "Les présentes CGV sont soumises au droit français. En cas de litige, les parties recherchent prioritairement une solution amiable." },
    { t: "p", text: "Lorsque le Client est un consommateur, les règles de compétence juridictionnelle protectrices qui lui sont applicables demeurent pleinement applicables." },

    { t: "h2", n: 19, text: "Acceptation" },
    { t: "p", text: "La validation d'une commande ou la signature d'un devis implique que le Client reconnaît avoir pris connaissance des présentes CGV et les accepter." },
  ];

  return (
    <Document title={`CGV — DIMZ`}>
      <Page size="A4" style={pdfStyles.page}>
        <LegalHeader docTitle="CGV" dossierReference={dossierReference} />
        <Text style={legalStyles.title}>Conditions Générales de Vente et de Prestation de Services</Text>
        <Text style={legalStyles.subtitle}>DIMZ — Mon Copilote Auto · Version : {dateGeneration}</Text>
        <LegalBody blocks={blocks} />
        <PdfFooter entreprise={entreprise} />
      </Page>
    </Document>
  );
}
