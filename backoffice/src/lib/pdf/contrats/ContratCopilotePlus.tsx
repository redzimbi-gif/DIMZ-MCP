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

export function ContratCopilotePlusDocument({ dossierReference, client, entreprise, champs, dateSignature }: Props) {
  const clientNom = `${client?.prenom ?? ""} ${client?.nom ?? ""}`.trim() || "[●]";
  const montant = champs.montant ? `${champs.montant} € TTC` : "[●] € TTC";

  const blocks: LegalBlock[] = [
    { t: "h2", text: "Entre les soussignés" },
    { t: "field", label: "DIMZ — Mon Copilote Auto", value: cp(entreprise?.nom_dirigeant) },
    { t: "field", label: "Adresse professionnelle", value: cp(entreprise?.adresse) },
    { t: "field", label: "SIRET", value: cp(entreprise?.siret) },
    { t: "field", label: "Email", value: cp(entreprise?.email) },
    { t: "p", text: "Ci-après dénommé « DIMZ »," },
    { t: "p", text: "Et le Client :" },
    { t: "field", label: "Nom / Prénom", value: clientNom },
    { t: "field", label: "Adresse", value: cp(client?.adresse) },
    { t: "field", label: "Téléphone", value: cp(client?.telephone) },
    { t: "field", label: "Email", value: cp(client?.email) },
    { t: "p", text: "Ci-après dénommé « le Client »." },

    { t: "h2", n: 1, text: "Le copilote prend le relais" },
    { t: "p", text: "Avec Copilote Plus, DIMZ va plus loin dans l'accompagnement." },
    { t: "p", text: "Le Client bénéficie d'un accompagnement renforcé, de la recherche du véhicule jusqu'à sa mise en main, selon les prestations définies dans le devis." },
    { t: "p", text: "L'objectif est simple : Trouver. Sécuriser. Accompagner. Livrer." },

    { t: "h2", n: 2, text: "Objet de la prestation" },
    { t: "p", text: "La prestation Copilote Plus peut comprendre, selon le devis accepté :" },
    { t: "h2", text: "Trouver" },
    { t: "list", items: ["analyse du besoin", "définition du cahier des charges", "recherche de véhicules", "présélection des annonces", "comparaison des opportunités", "analyse du positionnement du véhicule sur le marché"] },
    { t: "h2", text: "Sécuriser" },
    {
      t: "list",
      items: [
        "analyse des informations disponibles sur le véhicule",
        "vérification des éléments communiqués par le vendeur",
        "analyse de l'historique lorsque les données sont accessibles",
        "identification des éventuels points de vigilance",
        "recommandation d'une inspection professionnelle lorsque nécessaire",
      ],
    },
    { t: "h2", text: "Accompagner" },
    {
      t: "list",
      items: [
        "prise de contact avec le vendeur lorsque prévu",
        "accompagnement dans les échanges",
        "aide à la négociation",
        "accompagnement administratif prévu dans le devis",
        "suivi du dossier jusqu'à l'acquisition",
      ],
    },
    { t: "h2", text: "Livrer" },
    {
      t: "list",
      items: [
        "organisation de la récupération du véhicule",
        "convoyage lorsque celui-ci est inclus",
        "remise du véhicule au Client",
        "accompagnement à la mise en main du véhicule selon le niveau de prestation prévu",
      ],
    },

    { t: "h2", n: 3, text: "Prestations incluses" },
    { t: "p", text: "Les prestations réellement comprises dans l'offre sont celles détaillées dans le devis accepté par le Client." },
    { t: "p", text: "Toute prestation non expressément mentionnée dans le devis est considérée comme exclue. Peuvent notamment faire l'objet d'une facturation complémentaire :" },
    {
      t: "list",
      items: [
        "expertise mécanique",
        "contrôle technique",
        "rapport historique payant",
        "frais de déplacement exceptionnels",
        "transport par un tiers",
        "péages ou frais spécifiques",
        "formalités administratives particulières",
        "frais liés à l'immatriculation",
        "réparations",
        "nettoyage",
        "carburant ou recharge",
        "prestations demandées après validation du devis",
      ],
    },

    { t: "h2", n: 4, text: "Prix" },
    { t: "p", text: "Le prix de Copilote Plus est établi sur devis, en fonction du véhicule recherché, de sa localisation, du niveau d'accompagnement souhaité et des prestations nécessaires." },
    { t: "field", label: "Montant de la prestation", value: montant },
    ...(champs.montant_deja_paye
      ? ([{ t: "field", label: "Déjà réglé au titre de l'offre Copilote", value: `${champs.montant_deja_paye} €` }] as LegalBlock[])
      : []),
    { t: "p", text: "Si le Client a préalablement souscrit à l'offre Copilote, le montant déjà payé peut être déduit du prix de Copilote Plus selon les conditions indiquées dans le devis." },

    { t: "h2", n: 5, text: "DIMZ n'est pas le vendeur" },
    { t: "p", text: "DIMZ agit en qualité de prestataire de conseil et d'accompagnement. Le vendeur du véhicule reste juridiquement le vendeur." },
    { t: "p", text: "Le contrat de vente du véhicule est conclu entre le Client et le vendeur." },
    { t: "p", text: "DIMZ ne garantit donc pas les obligations du vendeur relatives à la vente du véhicule, sauf obligation propre à DIMZ résultant directement de la prestation qu'il a réalisée." },

    { t: "h2", n: 6, text: "Vérification du véhicule" },
    { t: "p", text: "DIMZ peut procéder à une analyse des éléments accessibles concernant le véhicule. Cette analyse ne constitue pas nécessairement une expertise mécanique." },
    { t: "p", text: "Lorsque le niveau de risque ou la nature du véhicule le justifie, DIMZ peut recommander ou organiser, avec l'accord du Client, une inspection réalisée par un professionnel compétent." },
    { t: "p", text: "Une inspection ne permet pas de garantir l'absence de tout défaut futur ou de tout vice caché." },

    { t: "h2", n: 7, text: "Négociation et acquisition" },
    { t: "p", text: "Lorsque la négociation est incluse dans la prestation, DIMZ peut échanger avec le vendeur afin de défendre les intérêts du Client dans le cadre défini par celui-ci." },
    { t: "p", text: "Sauf mandat spécifique et légalement applicable, DIMZ ne signe pas le contrat de vente à la place du Client. Le Client reste libre de suivre ou non les recommandations de DIMZ." },

    { t: "h2", n: 8, text: "Paiement du véhicule" },
    { t: "p", text: "Le prix d'achat du véhicule n'est pas compris dans la rémunération de DIMZ, sauf mention contraire expresse dans le devis." },
    { t: "p", text: "Le Client règle directement le vendeur, sauf dispositif spécifique expressément prévu et juridiquement applicable." },
    { t: "p", text: "DIMZ ne détient pas les fonds destinés à l'achat du véhicule, sauf accord particulier encadré dans les conditions applicables." },

    { t: "h2", n: 9, text: "Convoyage et livraison" },
    { t: "p", text: "Lorsque la livraison est incluse, les modalités de transport sont précisées dans le devis." },
    { t: "p", text: "La livraison peut être réalisée directement par DIMZ ou par un prestataire de transport/convoyage lorsque cela est nécessaire." },
    { t: "p", text: "Le Client est informé de la solution retenue lorsque celle-ci implique un tiers." },

    { t: "h2", n: 10, text: "Imprévu pendant la mission" },
    { t: "p", text: "L'achat automobile peut parfois réserver des imprévus." },
    { t: "p", text: "Si un véhicule initialement sélectionné présente un problème, si le vendeur modifie ses conditions ou si l'opération ne peut finalement pas être réalisée, DIMZ en informe le Client et lui propose, lorsque cela est possible, une solution alternative." },
    { t: "p", text: "L'objectif de DIMZ est de protéger la décision du Client, pas de forcer une transaction." },

    { t: "h2", n: 11, text: "Responsabilité" },
    { t: "p", text: "DIMZ s'engage à réaliser sa mission avec sérieux, diligence et professionnalisme. DIMZ ne peut toutefois garantir :" },
    {
      t: "list",
      items: [
        "qu'un véhicule répondra parfaitement aux attentes du Client",
        "qu'un vendeur acceptera une négociation",
        "qu'un véhicule restera disponible",
        "l'absence de défaut non détectable lors des vérifications réalisées",
        "l'absence de panne ou de problème ultérieur",
        "la qualité d'un véhicule lorsque celle-ci dépend d'un élément qui n'était pas accessible ou identifiable lors de la mission",
      ],
    },
    { t: "p", text: "DIMZ ne saurait être responsable d'une information fausse ou dissimulée par un vendeur lorsqu'elle n'était pas raisonnablement détectable dans le cadre de la prestation." },

    { t: "h2", n: 12, text: "Annulation et rétractation" },
    { t: "p", text: "Les conditions d'annulation et de rétractation applicables à la prestation sont celles prévues par la réglementation en vigueur et les conditions commerciales communiquées au Client." },
    { t: "p", text: "Lorsque le Client demande expressément que l'exécution de la prestation commence avant l'expiration du délai légal de rétractation, les conséquences de ce commencement anticipé sont celles prévues par la réglementation applicable." },

    { t: "h2", n: 13, text: "Données personnelles" },
    { t: "p", text: "Les données personnelles collectées dans le cadre de la prestation sont nécessaires à la gestion du dossier, aux échanges avec les différents intervenants et au suivi de la mission." },
    { t: "p", text: "DIMZ s'engage à traiter ces données conformément à la réglementation applicable en matière de protection des données personnelles." },

    { t: "h2", n: 14, text: "Fin de la mission" },
    { t: "p", text: "La mission prend fin lorsque les prestations prévues au devis ont été réalisées ou lorsque le Client décide de ne pas poursuivre l'acquisition d'un véhicule." },
    { t: "p", text: "Si une nouvelle recherche ou une nouvelle mission doit être engagée au-delà du périmètre initial, celle-ci pourra faire l'objet d'un nouveau devis." },

    { t: "h2", n: 15, text: "L'engagement DIMZ" },
    { t: "p", text: "Le Client reconnaît avoir compris que DIMZ intervient comme son copilote automobile. DIMZ accompagne, conseille, vérifie et alerte." },
    { t: "p", text: "La décision finale appartient toujours au Client." },
    { t: "p", text: "Notre rôle n'est pas de vendre une voiture à tout prix. Notre rôle est de vous aider à acheter la bonne voiture, dans les meilleures conditions possibles." },

    { t: "h2", n: 16, text: "Acceptation" },
    { t: "p", text: "Le Client reconnaît avoir pris connaissance du présent contrat et du devis associé et les accepter." },
  ];

  return (
    <Document title={`Contrat Copilote Plus — ${dossierReference}`}>
      <Page size="A4" style={pdfStyles.page}>
        <LegalHeader docTitle="Contrat de prestation — Offre Copilote Plus" dossierReference={dossierReference} />
        <Text style={legalStyles.title}>Contrat de prestation — Offre Copilote Plus</Text>
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
