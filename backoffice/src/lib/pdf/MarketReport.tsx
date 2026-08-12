import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { pdfStyles } from "./theme";
import { PdfLogo, PdfFooter } from "./PdfHeader";
import { formatCurrency } from "@/lib/format";
import type { Annonce, DossierOffre } from "@/lib/types";

type MarketAnnonce = Annonce & { photoUrl?: string | null };

interface Props {
  offre: DossierOffre;
  vehicules: MarketAnnonce[];
  commentaire?: string | null;
  dossierReference: string;
  clientNom: string;
}

const DEFAULT_INTRO: Record<string, string> = {
  copilote:
    "Votre copilote a exploré le marché et sélectionné les annonces qui correspondent le mieux à votre " +
    "projet. Chaque véhicule a été passé au crible et noté avec le Score DIMZ, pour vous aider à comparer " +
    "objectivement et prendre votre décision en toute confiance.",
  copilote_plus:
    "Votre copilote a exploré le marché et sélectionné, pour votre offre Copilote Plus, les annonces qui " +
    "correspondent le mieux à votre projet. Chaque véhicule a été passé au crible et noté avec le Score DIMZ. " +
    "Dès que vous validez un véhicule, votre copilote prend le relais jusqu'à la remise des clés.",
};

const TITLE: Record<string, string> = {
  copilote: "Copilote Market",
  copilote_plus: "Copilote + Market",
};

export function MarketReport({ offre, vehicules, commentaire, dossierReference, clientNom }: Props) {
  const isPlus = offre === "copilote_plus";
  const title = TITLE[offre] ?? "Copilote Market";
  const intro = DEFAULT_INTRO[offre] ?? DEFAULT_INTRO.copilote;

  return (
    <Document title={`${title} — ${dossierReference}`}>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <PdfLogo />
          <Text style={{ fontSize: 8, color: "#565c68" }}>Référence {dossierReference}</Text>
        </View>

        <Text style={pdfStyles.title}>{title}</Text>
        <Text style={pdfStyles.subtitle}>
          {dossierReference} — {clientNom}
        </Text>

        <View style={{ ...pdfStyles.section, borderLeft: "2px solid #2f6fed", paddingLeft: 12, marginBottom: commentaire?.trim() ? 10 : 20 }}>
          <Text style={{ fontSize: 9.5, lineHeight: 1.5, color: "#0b0d12" }}>{intro}</Text>
        </View>

        {commentaire?.trim() ? (
          <View style={{ ...pdfStyles.section, marginBottom: 20 }}>
            <Text style={{ fontSize: 9.5, lineHeight: 1.5, color: "#0b0d12" }}>{commentaire.trim()}</Text>
          </View>
        ) : null}

        {vehicules.map((v) => (
          <View
            key={v.id}
            style={{ marginBottom: 14, backgroundColor: "#f7f8fa", borderRadius: 8, overflow: "hidden" }}
            wrap={false}
          >
            {v.photoUrl ? <Image src={v.photoUrl} style={{ width: "100%", height: 140, objectFit: "cover" }} /> : null}
            <View style={{ padding: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>{v.titre}</Text>
                  <Text style={{ fontSize: 8.5, color: "#565c68", marginTop: 2 }}>
                    {[v.annee, v.kilometrage ? `${v.kilometrage.toLocaleString("fr-FR")} km` : null, v.localisation]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                {v.score_confiance != null ? (
                  <View style={{ alignItems: "center", backgroundColor: "#eef3ff", borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 }}>
                    <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: "#2f6fed" }}>
                      {v.score_confiance}/10
                    </Text>
                    <Text style={{ fontSize: 6.5, color: "#2f6fed" }}>Score DIMZ</Text>
                  </View>
                ) : null}
              </View>

              <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#2f6fed", marginBottom: 6 }}>
                {v.prix ? formatCurrency(v.prix) : "Prix non renseigné"}
                {v.prix_negocie ? ` → ${formatCurrency(v.prix_negocie)} négocié` : ""}
              </Text>

              {v.avis_copilote ? (
                <Text style={{ fontSize: 9, lineHeight: 1.5, color: "#0b0d12", backgroundColor: "#fff", borderRadius: 6, padding: 8, marginBottom: 6 }}>
                  « {v.avis_copilote} »
                </Text>
              ) : null}

              {v.points_forts ? (
                <Text style={{ fontSize: 8.5, lineHeight: 1.4, color: "#1a9e6b", marginBottom: 2 }}>+ {v.points_forts}</Text>
              ) : null}
              {v.points_faibles ? (
                <Text style={{ fontSize: 8.5, lineHeight: 1.4, color: "#b5780a" }}>! {v.points_faibles}</Text>
              ) : null}
            </View>
          </View>
        ))}

        <View style={{ flexGrow: 1 }} />

        <View style={{ marginTop: 20, padding: 14, backgroundColor: "#eef3ff", borderRadius: 8 }} wrap={false}>
          {isPlus ? (
            <>
              <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#1a44a6", marginBottom: 4 }}>
                Et maintenant ?
              </Text>
              <Text style={{ fontSize: 9, lineHeight: 1.5, color: "#0b0d12" }}>
                Dès que vous aurez validé le véhicule qui vous convient, votre copilote organisera une
                inspection complète avant l'achat — le Rapport DIMZ que vous recevrez ensuite. Rien n'est
                engagé avant cette étape.
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#1a44a6", marginBottom: 4 }}>
                Envie d'aller plus loin ?
              </Text>
              <Text style={{ fontSize: 9, lineHeight: 1.5, color: "#0b0d12" }}>
                Avec Copilote Plus, votre copilote prend le relais jusqu'à la remise des clés : mise en
                relation avec le vendeur, inspection complète du véhicule choisi, accompagnement à l'achat,
                démarches administratives et livraison incluses. Le montant déjà réglé pour l'offre Copilote
                sera intégralement déduit du prix de Copilote Plus.
              </Text>
            </>
          )}
        </View>

        <PdfFooter />
      </Page>
    </Document>
  );
}
