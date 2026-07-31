import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "./theme";
import { PdfLogo, PdfFooter } from "./PdfHeader";
import type { Inspection } from "@/lib/types";
import { formatDate } from "@/lib/format";

interface Props {
  inspection: Inspection;
  dossierReference: string;
  clientNom: string;
}

const SECTIONS: { key: keyof Inspection; label: string }[] = [
  { key: "etat_exterieur", label: "État extérieur" },
  { key: "etat_interieur", label: "État intérieur" },
  { key: "pneus", label: "Pneus" },
  { key: "freins", label: "Freins" },
  { key: "carrosserie", label: "Carrosserie" },
  { key: "mecanique", label: "Mécanique" },
  { key: "essai_routier", label: "Essai routier" },
  { key: "defauts_constates", label: "Défauts constatés" },
  { key: "commentaires", label: "Commentaires" },
];

export function InspectionReport({ inspection, dossierReference, clientNom }: Props) {
  return (
    <Document title={`Rapport d'inspection — ${dossierReference}`}>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <PdfLogo />
          {inspection.note_finale != null ? (
            <View style={pdfStyles.scoreBox}>
              <Text style={pdfStyles.scoreValue}>{inspection.note_finale}/10</Text>
              <Text style={pdfStyles.scoreLabel}>Note finale</Text>
            </View>
          ) : null}
        </View>

        <Text style={pdfStyles.title}>Rapport d'inspection</Text>
        <Text style={pdfStyles.subtitle}>
          {dossierReference} — {clientNom} — {formatDate(inspection.date_inspection)}
        </Text>

        {SECTIONS.map(({ key, label }) => {
          const value = inspection[key];
          if (!value || typeof value !== "string") return null;
          return (
            <View style={pdfStyles.section} key={key}>
              <Text style={pdfStyles.sectionTitle}>{label}</Text>
              <Text style={pdfStyles.text}>{value}</Text>
            </View>
          );
        })}

        <PdfFooter />
      </Page>
    </Document>
  );
}
