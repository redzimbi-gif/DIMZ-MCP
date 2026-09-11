import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { pdfStyles } from "../theme";
import { PdfLogo } from "../PdfHeader";

export const legalStyles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    borderBottom: "1px solid #e6e8ee",
    paddingBottom: 10,
  },
  refText: { fontSize: 8, color: "#565c68" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle: { fontSize: 9, color: "#565c68", marginBottom: 16 },
  h2: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: "#0b0d12", marginTop: 12, marginBottom: 5 },
  p: { fontSize: 9, lineHeight: 1.5, color: "#0b0d12", marginBottom: 6 },
  li: { fontSize: 9, lineHeight: 1.5, color: "#0b0d12", marginBottom: 3, paddingLeft: 10 },
  divider: { borderBottom: "0.5px solid #e6e8ee", marginTop: 4, marginBottom: 10 },
  fieldRow: { flexDirection: "row", marginBottom: 4 },
  fieldLabel: { fontSize: 9, color: "#565c68", width: 190 },
  fieldValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#0b0d12" },
});

export type LegalBlock =
  | { t: "p"; text: string }
  | { t: "h2"; n?: string | number; text: string }
  | { t: "list"; items: string[] }
  | { t: "divider" }
  | { t: "field"; label: string; value: string };

export function LegalHeader({ docTitle, dossierReference }: { docTitle: string; dossierReference: string }) {
  return (
    <View style={legalStyles.headerBar} fixed>
      <PdfLogo />
      <Text style={legalStyles.refText}>
        {docTitle} — Réf. {dossierReference}
      </Text>
    </View>
  );
}

export function LegalBody({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.t === "h2")
          return (
            <Text key={i} style={legalStyles.h2}>
              {b.n ? `${b.n}. ` : ""}
              {b.text}
            </Text>
          );
        if (b.t === "p")
          return (
            <Text key={i} style={legalStyles.p}>
              {b.text}
            </Text>
          );
        if (b.t === "list")
          return (
            <View key={i} style={{ marginBottom: 6 }}>
              {b.items.map((item, j) => (
                <Text key={j} style={legalStyles.li}>
                  • {item}
                </Text>
              ))}
            </View>
          );
        if (b.t === "field")
          return (
            <View key={i} style={legalStyles.fieldRow}>
              <Text style={legalStyles.fieldLabel}>{b.label}</Text>
              <Text style={legalStyles.fieldValue}>{b.value || "—"}</Text>
            </View>
          );
        if (b.t === "divider") return <View key={i} style={legalStyles.divider} />;
        return null;
      })}
    </>
  );
}

export function SignatureBlock({
  ville,
  date,
  clientLabel = "Le Client",
  clientNom,
  dimzNom,
}: {
  ville: string;
  date: string;
  clientLabel?: string;
  clientNom: string;
  dimzNom: string;
}) {
  return (
    <View style={pdfStyles.signatureBox} wrap={false}>
      <Text style={legalStyles.p}>
        Fait à {ville}, le {date}
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 18 }}>
        <View style={{ width: "45%" }}>
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>{clientLabel}</Text>
          <Text style={{ fontSize: 8.5, color: "#565c68" }}>{clientNom}</Text>
          <Text style={{ fontSize: 8, color: "#8a909c", marginTop: 10 }}>
            Signature précédée de la mention « Lu et approuvé »
          </Text>
        </View>
        <View style={{ width: "45%" }}>
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>DIMZ — Mon copilote auto</Text>
          <Text style={{ fontSize: 8.5, color: "#565c68" }}>{dimzNom}</Text>
          <Text style={{ fontSize: 8, color: "#8a909c", marginTop: 10 }}>Signature</Text>
        </View>
      </View>
    </View>
  );
}
