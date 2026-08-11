import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "../theme";
import { PdfFooter } from "../PdfHeader";
import { LegalHeader, LegalBody, legalStyles, type LegalBlock } from "./shared";
import type { Client } from "@/lib/types";

interface Props {
  dossierReference: string;
  client: Client | null | undefined;
  champs: Record<string, string>;
  date: string;
}

const cp = (v: string | undefined) => v || "[À COMPLÉTER]";

const CHECKLIST_PHOTOS = [
  "Avant",
  "Arrière",
  "Côté gauche",
  "Côté droit",
  "Jantes",
  "Habitacle",
  "Tableau de bord",
  "Kilométrage",
  "Niveau carburant / charge",
];

export function EtatVehiculeDocument({ dossierReference, client, champs, date }: Props) {
  const clientNom = `${client?.prenom ?? ""} ${client?.nom ?? ""}`.trim() || "[●]";

  const blocks: LegalBlock[] = [
    { t: "h2", n: 1, text: "Identification" },
    { t: "field", label: "Marque / Modèle", value: cp(champs.marque_modele) },
    { t: "field", label: "Immatriculation", value: cp(champs.immatriculation) },
    { t: "field", label: "VIN", value: cp(champs.vin) },
    { t: "field", label: "Kilométrage au départ", value: cp(champs.km_depart) },
    { t: "field", label: "Date / heure de prise en charge", value: cp(champs.date_prise_en_charge) },
    { t: "field", label: "Lieu de départ", value: cp(champs.lieu_depart) },
    { t: "field", label: "Lieu d'arrivée", value: cp(champs.lieu_arrivee) },

    { t: "h2", n: 2, text: "État au départ" },
    { t: "field", label: "Carburant / niveau de charge", value: cp(champs.carburant_depart) },
    { t: "field", label: "Voyants allumés", value: cp(champs.voyants_depart) },
    { t: "field", label: "État extérieur", value: cp(champs.etat_exterieur_depart) },
    { t: "field", label: "Observations", value: cp(champs.observations_depart) },
    { t: "p", text: "Photos prises :" },
    { t: "list", items: [...CHECKLIST_PHOTOS, `Autres : ${champs.photos_autres || "—"}`] },

    { t: "h2", n: 3, text: "État à l'arrivée" },
    { t: "field", label: "Kilométrage à l'arrivée", value: cp(champs.km_arrivee) },
    { t: "field", label: "Carburant / niveau de charge", value: cp(champs.carburant_arrivee) },
    { t: "field", label: "Voyants allumés", value: cp(champs.voyants_arrivee) },
    { t: "field", label: "Dommages constatés", value: cp(champs.dommages_arrivee) },
    { t: "field", label: "Observations", value: cp(champs.observations_arrivee) },

    { t: "h2", n: 4, text: "Réserves" },
    { t: "p", text: "Le Client / destinataire formule les réserves suivantes :" },
    { t: "field", label: "Réserves", value: cp(champs.reserves) },

    { t: "h2", n: 5, text: "Signatures" },
    { t: "p", text: "Le présent état permet de constater l'état apparent du véhicule au moment de sa prise en charge et de sa restitution." },
    { t: "p", text: "Il ne constitue pas une expertise mécanique." },
  ];

  return (
    <Document title={`État du véhicule — ${dossierReference}`}>
      <Page size="A4" style={pdfStyles.page}>
        <LegalHeader docTitle="État du véhicule — Convoyage" dossierReference={dossierReference} />
        <Text style={legalStyles.title}>État du véhicule — Convoyage</Text>
        <Text style={legalStyles.subtitle}>
          {dossierReference} — {clientNom}
        </Text>
        <LegalBody blocks={blocks} />

        <View style={pdfStyles.signatureBox} wrap={false}>
          <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", marginBottom: 8 }}>Prise en charge</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 9, color: "#565c68" }}>DIMZ : ______________________</Text>
            <Text style={{ fontSize: 9, color: "#565c68" }}>Client / représentant : ______________________</Text>
          </View>
          <Text style={{ fontSize: 8.5, color: "#8a909c", marginTop: 4 }}>Date : {date}</Text>
        </View>

        <View style={[pdfStyles.signatureBox, { marginTop: 16 }]} wrap={false}>
          <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", marginBottom: 8 }}>Restitution</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 9, color: "#565c68" }}>DIMZ : ______________________</Text>
            <Text style={{ fontSize: 9, color: "#565c68" }}>Client / destinataire : ______________________</Text>
          </View>
          <Text style={{ fontSize: 8.5, color: "#8a909c", marginTop: 4 }}>Date : [●]</Text>
        </View>

        <PdfFooter />
      </Page>
    </Document>
  );
}
