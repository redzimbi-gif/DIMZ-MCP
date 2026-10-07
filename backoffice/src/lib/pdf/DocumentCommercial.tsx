import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "./theme";
import { PdfLogo, PdfFooter } from "./PdfHeader";
import type { DocumentCommercial, EntrepriseInfo, LigneDocumentCommercial } from "@/lib/types";
import { DOCUMENT_COMMERCIAL_TYPE_LABELS } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

interface Props {
  doc: DocumentCommercial;
  clientNom: string;
  clientAdresse?: string | null;
  clientRaisonSociale?: string | null;
  clientSiret?: string | null;
  entreprise?: EntrepriseInfo | null;
}

function LigneRow({ ligne, isHeader }: { ligne?: LigneDocumentCommercial; isHeader?: boolean }) {
  const total = ligne ? ligne.quantite * ligne.prix_unitaire_ht : 0;
  return (
    <View
      style={{
        flexDirection: "row",
        borderBottom: "1px solid #e6e8ee",
        paddingVertical: isHeader ? 6 : 8,
        backgroundColor: isHeader ? "#f7f8fa" : undefined,
      }}
    >
      <Text style={{ flex: 4, fontSize: 9, fontFamily: isHeader ? "Helvetica-Bold" : "Helvetica", color: isHeader ? "#565c68" : "#0b0d12", textTransform: isHeader ? "uppercase" : undefined }}>
        {isHeader ? "Description" : ligne?.description}
      </Text>
      <Text style={{ flex: 1, fontSize: 9, textAlign: "right", fontFamily: isHeader ? "Helvetica-Bold" : "Helvetica", color: isHeader ? "#565c68" : "#0b0d12", textTransform: isHeader ? "uppercase" : undefined }}>
        {isHeader ? "Qté" : ligne?.quantite}
      </Text>
      <Text style={{ flex: 1.6, fontSize: 9, textAlign: "right", fontFamily: isHeader ? "Helvetica-Bold" : "Helvetica", color: isHeader ? "#565c68" : "#0b0d12", textTransform: isHeader ? "uppercase" : undefined }}>
        {isHeader ? "Prix unit. HT" : formatCurrency(ligne!.prix_unitaire_ht)}
      </Text>
      <Text style={{ flex: 1.6, fontSize: 9, textAlign: "right", fontFamily: "Helvetica-Bold", color: isHeader ? "#565c68" : "#0b0d12", textTransform: isHeader ? "uppercase" : undefined }}>
        {isHeader ? "Total HT" : formatCurrency(total)}
      </Text>
    </View>
  );
}

export function DocumentCommercialPdf({ doc, clientNom, clientAdresse, clientRaisonSociale, clientSiret, entreprise }: Props) {
  const isFacture = doc.type === "facture";
  return (
    <Document title={`${DOCUMENT_COMMERCIAL_TYPE_LABELS[doc.type]} ${doc.numero}`}>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <PdfLogo />
          <Text style={{ fontSize: 8, color: "#565c68" }}>{doc.numero}</Text>
        </View>

        <Text style={pdfStyles.title}>{DOCUMENT_COMMERCIAL_TYPE_LABELS[doc.type]}</Text>
        <Text style={pdfStyles.subtitle}>
          {doc.objet || (isFacture ? "Facture" : "Devis")} — émis le {formatDate(doc.date_emission)}
          {doc.date_echeance
            ? isFacture
              ? ` — échéance le ${formatDate(doc.date_echeance)}`
              : ` — valable jusqu'au ${formatDate(doc.date_echeance)}`
            : ""}
        </Text>

        <View style={{ flexDirection: "row", marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={pdfStyles.sectionTitle}>Émetteur</Text>
            <Text style={pdfStyles.text}>{entreprise?.nom_dirigeant || "DIMZ - Mon Copilote Auto"}</Text>
            {entreprise?.adresse ? <Text style={pdfStyles.text}>{entreprise.adresse}</Text> : null}
            {entreprise?.ville ? <Text style={pdfStyles.text}>{entreprise.ville}</Text> : null}
            {entreprise?.siret ? <Text style={pdfStyles.text}>SIRET {entreprise.siret}</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={pdfStyles.sectionTitle}>Destinataire</Text>
            <Text style={pdfStyles.text}>{clientRaisonSociale || clientNom}</Text>
            {clientRaisonSociale ? <Text style={pdfStyles.text}>{clientNom}</Text> : null}
            {clientSiret ? <Text style={pdfStyles.text}>SIRET {clientSiret}</Text> : null}
            {clientAdresse ? <Text style={pdfStyles.text}>{clientAdresse}</Text> : null}
          </View>
        </View>

        <LigneRow isHeader />
        {doc.lignes.map((ligne, i) => (
          <LigneRow key={i} ligne={ligne} />
        ))}

        <View style={{ marginTop: 14, alignItems: "flex-end" }}>
          <View style={{ width: 220 }}>
            <View style={pdfStyles.row}>
              <Text style={pdfStyles.rowLabel}>Total HT</Text>
              <Text style={pdfStyles.rowValue}>{formatCurrency(doc.montant_ht)}</Text>
            </View>
            <View style={pdfStyles.row}>
              <Text style={pdfStyles.rowLabel}>TVA</Text>
              <Text style={pdfStyles.rowValue}>{formatCurrency(doc.montant_tva)}</Text>
            </View>
            <View style={{ ...pdfStyles.row, borderTop: "1px solid #e6e8ee", paddingTop: 6 }}>
              <Text style={{ ...pdfStyles.rowLabel, fontFamily: "Helvetica-Bold", color: "#0b0d12" }}>
                Total {isFacture ? "à payer" : "TTC"}
              </Text>
              <Text style={{ ...pdfStyles.rowValue, fontSize: 12, color: "#2f6fed" }}>{formatCurrency(doc.montant_ttc)}</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 7.5, color: "#8a909c", lineHeight: 1.5 }}>
            {isFacture
              ? "En cas de retard de paiement, une pénalité au taux annuel de 3 fois le taux d'intérêt légal sera appliquée, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 €, conformément aux articles L441-10 et D441-5 du Code de commerce. TVA non applicable, article 293 B du CGI."
              : `Devis valable ${doc.date_echeance ? `jusqu'au ${formatDate(doc.date_echeance)}` : "30 jours"} à compter de sa date d'émission. Bon pour accord : signature précédée de la mention manuscrite « Bon pour accord ».`}
          </Text>
        </View>

        <PdfFooter entreprise={entreprise} />
      </Page>
    </Document>
  );
}
