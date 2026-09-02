import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { pdfStyles } from "./theme";
import { PdfLogo, PdfFooter } from "./PdfHeader";
import { ScoreRing } from "./ScoreRing";
import { formatCurrency } from "@/lib/format";
import type { Annonce, DossierOffre } from "@/lib/types";

type MarketAnnonce = Annonce & { photoUrl?: string | null };

const CRITERE_SCORES: { key: keyof Annonce; label: string }[] = [
  { key: "score_prix", label: "Prix" },
  { key: "score_historique", label: "Historique" },
  { key: "score_etat", label: "État" },
  { key: "score_adequation", label: "Adéquation" },
];

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

        {isPlus ? (
          <Text style={pdfStyles.title}>
            Copilote <Text style={{ color: "#2f6fed", fontSize: 21 }}>+</Text> Market
          </Text>
        ) : (
          <Text style={pdfStyles.title}>{title}</Text>
        )}
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

        {vehicules.map((v) => {
          const criteres = CRITERE_SCORES.filter(({ key }) => v[key] != null);
          return (
            <View
              key={v.id}
              style={{ marginBottom: 14, backgroundColor: "#f7f8fa", borderRadius: 8, overflow: "hidden" }}
              wrap={false}
            >
              {v.photoUrl ? <Image src={v.photoUrl} style={{ width: "100%", height: 140, objectFit: "cover" }} /> : null}
              <View style={{ padding: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                  {v.score_confiance != null ? (
                    <View style={{ marginRight: 12 }}>
                      <ScoreRing value={v.score_confiance} size={46} fontSize={10} />
                    </View>
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>{v.titre}</Text>
                    <Text style={{ fontSize: 8.5, color: "#565c68", marginTop: 2 }}>
                      {[v.annee, v.kilometrage ? `${v.kilometrage.toLocaleString("fr-FR")} km` : null, v.localisation]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                    <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#2f6fed", marginTop: 3 }}>
                      {v.prix ? formatCurrency(v.prix) : "Prix non renseigné"}
                      {v.prix_negocie ? ` → ${formatCurrency(v.prix_negocie)} négocié` : ""}
                    </Text>
                  </View>
                </View>

                {criteres.length > 0 ? (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ ...pdfStyles.sectionTitle, fontSize: 7, marginBottom: 5 }}>Score par critère</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                      {criteres.map(({ key, label }) => {
                        const value = v[key] as number;
                        return (
                          <View key={key as string} style={{ width: "50%", marginBottom: 6, paddingRight: 10 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                              <Text style={{ fontSize: 7.5, color: "#565c68" }}>{label}</Text>
                              <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold" }}>{value}/10</Text>
                            </View>
                            <View style={{ height: 3, borderRadius: 2, backgroundColor: "#e6e8ee" }}>
                              <View
                                style={{
                                  height: 3,
                                  borderRadius: 2,
                                  backgroundColor: "#2f6fed",
                                  width: `${(value / 10) * 100}%`,
                                }}
                              />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {v.avis_copilote ? (
                  <View style={{ borderLeft: "2px solid #2f6fed", paddingLeft: 8, marginBottom: 6 }}>
                    <Text style={{ fontSize: 9, fontFamily: "Helvetica-Oblique", lineHeight: 1.5, color: "#0b0d12" }}>
                      « {v.avis_copilote} »
                    </Text>
                  </View>
                ) : null}

                {v.points_forts ? (
                  <Text style={{ fontSize: 8.5, lineHeight: 1.4, color: "#1a9e6b", marginBottom: 2 }}>+ {v.points_forts}</Text>
                ) : null}
                {v.points_faibles ? (
                  <Text style={{ fontSize: 8.5, lineHeight: 1.4, color: "#b5780a" }}>! {v.points_faibles}</Text>
                ) : null}
              </View>
            </View>
          );
        })}

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
