import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { pdfStyles } from "./theme";
import { PdfLogo, PdfFooter } from "./PdfHeader";
import type { Convoyage, ConvoyageEtatLieux, EntrepriseInfo, EtatLieuxType } from "@/lib/types";
import { CONVOYAGE_STATUT_LABELS } from "@/lib/types";
import { ETAT_LIEUX_PHOTO_SLOTS, ETAT_LIEUX_TYPE_LABELS } from "@/lib/etat-lieux";
import { formatDate, formatDateTime } from "@/lib/format";

interface Props {
  convoyage: Convoyage;
  dossierReference: string;
  clientNom: string;
  entreprise?: EntrepriseInfo | null;
  etatsLieux: {
    type: EtatLieuxType;
    data: ConvoyageEtatLieux;
    photoUrls: Record<string, string>;
    photosAutresUrls: string[];
    signatureUrl: string | null;
  }[];
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

function EtatLieuxSection({
  type,
  data,
  photoUrls,
  photosAutresUrls,
  signatureUrl,
}: {
  type: EtatLieuxType;
  data: ConvoyageEtatLieux;
  photoUrls: Record<string, string>;
  photosAutresUrls: string[];
  signatureUrl: string | null;
}) {
  return (
    <View style={{ marginTop: 18 }} break={type === "arrivee"}>
      <Text style={pdfStyles.sectionTitle}>État des lieux — {ETAT_LIEUX_TYPE_LABELS[type]}</Text>
      <Row label="Kilométrage" value={data.kilometrage != null ? `${data.kilometrage} km` : null} />
      <Row label="Carburant" value={data.carburant} />
      <Row label="Contact présent" value={data.contact_nom} />
      <Row label="Confirmé le" value={data.confirme_at ? formatDateTime(data.confirme_at) : null} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {ETAT_LIEUX_PHOTO_SLOTS.map((slot) =>
          photoUrls[slot.key] ? (
            <View key={slot.key} style={{ width: 82 }}>
              <Image src={photoUrls[slot.key]} style={{ width: 82, height: 82, borderRadius: 4, objectFit: "cover" }} />
              <Text style={{ fontSize: 6, color: "#565c68", marginTop: 2, textAlign: "center" }}>{slot.label}</Text>
            </View>
          ) : null
        )}
      </View>

      {photosAutresUrls.length > 0 ? (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#0b0d12", marginBottom: 4 }}>
            Photos complémentaires
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {photosAutresUrls.map((url, i) => (
              <Image key={i} src={url} style={{ width: 82, height: 82, borderRadius: 4, objectFit: "cover" }} />
            ))}
          </View>
        </View>
      ) : null}

      {signatureUrl ? (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#0b0d12", marginBottom: 4 }}>
            Signature — {ETAT_LIEUX_TYPE_LABELS[type]}
          </Text>
          <Image src={signatureUrl} style={{ width: 140, height: 56, objectFit: "contain" }} />
        </View>
      ) : null}
    </View>
  );
}

export function ConvoyageReport({ convoyage, dossierReference, clientNom, entreprise, etatsLieux }: Props) {
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

        {etatsLieux.length === 0 ? (
          <Text style={pdfStyles.text}>Aucun état des lieux n'a encore été rempli pour ce convoyage.</Text>
        ) : (
          etatsLieux.map((el) => (
            <EtatLieuxSection
              key={el.type}
              type={el.type}
              data={el.data}
              photoUrls={el.photoUrls}
              photosAutresUrls={el.photosAutresUrls}
              signatureUrl={el.signatureUrl}
            />
          ))
        )}

        <PdfFooter entreprise={entreprise} />
      </Page>
    </Document>
  );
}
