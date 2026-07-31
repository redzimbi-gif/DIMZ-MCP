import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { pdfStyles } from "./theme";
import { PdfLogo, PdfFooter } from "./PdfHeader";
import type { Convoyage } from "@/lib/types";
import { CONVOYAGE_STATUT_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/format";

interface Props {
  convoyage: Convoyage;
  dossierReference: string;
  clientNom: string;
  signatureUrl?: string | null;
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <View style={pdfStyles.row}>
      <Text style={pdfStyles.rowLabel}>{label}</Text>
      <Text style={pdfStyles.rowValue}>{String(value)}</Text>
    </View>
  );
}

export function ConvoyageReport({ convoyage, dossierReference, clientNom, signatureUrl }: Props) {
  return (
    <Document title={`Rapport de convoyage — ${dossierReference}`}>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <PdfLogo />
        </View>

        <Text style={pdfStyles.title}>Rapport de livraison</Text>
        <Text style={pdfStyles.subtitle}>
          {dossierReference} — {clientNom} — {CONVOYAGE_STATUT_LABELS[convoyage.statut]}
        </Text>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Trajet</Text>
          <Row label="Départ" value={convoyage.adresse_depart} />
          <Row label="Arrivée" value={convoyage.adresse_arrivee} />
          <Row label="Date" value={convoyage.date_convoyage ? formatDate(convoyage.date_convoyage) : null} />
          <Row label="Heure" value={convoyage.heure} />
          <Row label="Conducteur" value={convoyage.conducteur} />
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Véhicule</Text>
          <Row label="Kilométrage départ" value={convoyage.km_depart} />
          <Row label="Kilométrage arrivée" value={convoyage.km_arrivee} />
          <Row label="Niveau de carburant" value={convoyage.niveau_carburant} />
        </View>

        {convoyage.rapport_notes ? (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Notes de livraison</Text>
            <Text style={pdfStyles.text}>{convoyage.rapport_notes}</Text>
          </View>
        ) : null}

        {signatureUrl ? (
          <View style={pdfStyles.signatureBox}>
            <Text style={pdfStyles.sectionTitle}>Signature du client</Text>
            <Image src={signatureUrl} style={{ width: 160, height: 64, objectFit: "contain" }} />
          </View>
        ) : null}

        <PdfFooter />
      </Page>
    </Document>
  );
}
