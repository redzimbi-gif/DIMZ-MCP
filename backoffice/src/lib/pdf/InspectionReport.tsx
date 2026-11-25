import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { pdfStyles } from "./theme";
import { PdfLogo, PdfFooter } from "./PdfHeader";
import { ScoreRing } from "./ScoreRing";
import { INSPECTION_VERDICT_LABELS, type Inspection, type DossierOffre } from "@/lib/types";
import { formatDate, splitLines, splitTags } from "@/lib/format";

interface Props {
  inspection: Inspection;
  dossierReference: string;
  clientNom: string;
  offre?: DossierOffre | null;
  /**
   * URLs signées des photos de l'inspection, dans l'ordre d'upload. Le PDF ne
   * peut pas les récupérer lui-même : le bucket est privé et `renderToBuffer`
   * est synchrone côté rendu, donc l'appelant signe les chemins avant
   * (cf. getSignedUrls dans src/lib/storage.ts), comme pour le rapport de
   * convoyage.
   *
   * Promesse publique : le site annonce « avec photos réelles du véhicule
   * inspecté » et affiche une section « Photos jointes au rapport » dans son
   * exemple de rapport. Un rapport sans photos ne tient pas cette promesse.
   */
  photoUrls?: string[];
}

/**
 * Six photos au maximum sur la page du rapport : au-delà, la grille déborde
 * sur une seconde page et noie les sections de conclusion, qui comptent plus
 * pour le client. Les autres photos restent accessibles sur le portail de
 * suivi et dans le back-office.
 */
const MAX_PHOTOS_RAPPORT = 6;

const CATEGORY_SCORES: { key: keyof Inspection; label: string }[] = [
  { key: "score_administratif", label: "Contrôle administratif" },
  { key: "score_exterieur", label: "Inspection extérieure" },
  { key: "score_interieur", label: "Inspection intérieure" },
  { key: "score_mecanique", label: "Contrôle mécanique" },
  { key: "score_essai_routier", label: "Essai routier" },
  { key: "score_marche", label: "Analyse du marché" },
];

/**
 * Les observations écrites du copilote, poste par poste. Elles sont saisies
 * dans le formulaire d'inspection et stockées en base depuis l'origine, mais
 * n'apparaissaient nulle part dans le rapport remis au client : de la saisie
 * perdue, et le détail qui justifie les scores de la page précédente.
 */
const CONSTATATIONS: { key: keyof Inspection; label: string }[] = [
  { key: "etat_exterieur", label: "État extérieur" },
  { key: "carrosserie", label: "Carrosserie" },
  { key: "pneus", label: "Pneumatiques" },
  { key: "etat_interieur", label: "État intérieur" },
  { key: "mecanique", label: "Mécanique" },
  { key: "freins", label: "Freinage" },
  { key: "essai_routier", label: "Essai routier" },
  { key: "defauts_constates", label: "Défauts constatés" },
  { key: "commentaires", label: "Commentaires du copilote" },
];

const VERDICT_COLORS: Record<string, string> = {
  recommande: "#1a9e6b",
  envisageable: "#b5780a",
  deconseille: "#d13f3f",
};

export function InspectionReport({ inspection, dossierReference, clientNom, offre, photoUrls = [] }: Props) {
  const tags = splitTags(inspection.tags);
  const pointsPositifs = splitLines(inspection.points_positifs);
  const pointsVigilance = splitLines(inspection.points_vigilance);
  const categoryScores = CATEGORY_SCORES.filter(({ key }) => inspection[key] != null);
  const photos = photoUrls.slice(0, MAX_PHOTOS_RAPPORT);
  const constatations = CONSTATATIONS.map(({ key, label }) => ({
    label,
    valeur: (inspection[key] as string | null) || null,
  })).filter((c) => c.valeur !== null);
  const photosRestantes = Math.max(0, photoUrls.length - photos.length);

  return (
    <Document title={`Rapport DIMZ — ${inspection.reference}`}>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <View>
            <PdfLogo />
            <Text style={{ fontSize: 8, color: "#565c68", marginTop: 4 }}>
              {[inspection.lieu, inspection.expert_nom].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 8, color: "#565c68" }}>Référence {inspection.reference}</Text>
            <Text style={{ fontSize: 8, color: "#565c68" }}>
              Inspection du {formatDate(inspection.date_inspection)}
              {inspection.duree_sur_site ? ` · ${inspection.duree_sur_site} sur site` : ""}
            </Text>
          </View>
        </View>

        <Text style={pdfStyles.title}>Rapport DIMZ</Text>
        <Text style={pdfStyles.subtitle}>
          {dossierReference} — {clientNom}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          {inspection.note_finale != null ? (
            <View style={{ marginRight: 16, alignItems: "center", width: 74 }}>
              <ScoreRing value={inspection.note_finale} suffix="/ 10" />
              <Text style={{ fontSize: 7, color: "#565c68", marginTop: 4, textAlign: "center" }}>
                Score DIMZ global
              </Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            {inspection.vehicule_titre ? (
              <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
                {inspection.vehicule_titre}
              </Text>
            ) : null}
            {inspection.annonce_comparee ? (
              <Text style={{ fontSize: 9, color: "#565c68", marginBottom: 6 }}>{inspection.annonce_comparee}</Text>
            ) : null}
            {tags.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {tags.map((tag) => (
                  <Text
                    key={tag}
                    style={{
                      fontSize: 7.5,
                      color: "#2f6fed",
                      backgroundColor: "#eef3ff",
                      borderRadius: 8,
                      paddingVertical: 3,
                      paddingHorizontal: 7,
                      marginRight: 5,
                      marginBottom: 4,
                    }}
                  >
                    {tag}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {categoryScores.length > 0 ? (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Score par étape du contrôle</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {categoryScores.map(({ key, label }) => {
                const value = inspection[key] as number;
                return (
                  <View key={key as string} style={{ width: "50%", marginBottom: 8, paddingRight: 10 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                      <Text style={{ fontSize: 8.5, color: "#565c68" }}>{label}</Text>
                      <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold" }}>{value}/10</Text>
                    </View>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: "#e6e8ee" }}>
                      <View
                        style={{
                          height: 4,
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

        {photos.length > 0 ? (
          <View style={pdfStyles.section} wrap={false}>
            <Text style={pdfStyles.sectionTitle}>Photos jointes au rapport</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {photos.map((url, i) => (
                <Image
                  key={i}
                  src={url}
                  style={{ width: 150, height: 100, borderRadius: 4, objectFit: "cover" }}
                />
              ))}
            </View>
            {photosRestantes > 0 ? (
              <Text style={{ fontSize: 7.5, color: "#8a909c", marginTop: 5 }}>
                {photosRestantes === 1
                  ? "1 photo supplémentaire est disponible sur votre espace de suivi."
                  : `${photosRestantes} photos supplémentaires sont disponibles sur votre espace de suivi.`}
              </Text>
            ) : null}
          </View>
        ) : null}

        {pointsPositifs.length > 0 || pointsVigilance.length > 0 ? (
          <View style={{ ...pdfStyles.section, ...pdfStyles.grid2 }}>
            {pointsPositifs.length > 0 ? (
              <View style={pdfStyles.col}>
                <Text style={{ ...pdfStyles.sectionTitle, color: "#1a9e6b" }}>Points positifs</Text>
                {pointsPositifs.map((point, i) => (
                  <Text key={i} style={{ fontSize: 9, lineHeight: 1.5, marginBottom: 3 }}>
                    + {point}
                  </Text>
                ))}
              </View>
            ) : null}
            {pointsVigilance.length > 0 ? (
              <View style={pdfStyles.col}>
                <Text style={{ ...pdfStyles.sectionTitle, color: "#b5780a" }}>Points de vigilance</Text>
                {pointsVigilance.map((point, i) => (
                  <Text key={i} style={{ fontSize: 9, lineHeight: 1.5, marginBottom: 3 }}>
                    ! {point}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {inspection.avis_copilote ? (
          <View style={{ ...pdfStyles.section, borderLeft: "2px solid #2f6fed", paddingLeft: 12 }}>
            <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Oblique", lineHeight: 1.5, color: "#0b0d12" }}>
              « {inspection.avis_copilote} »
            </Text>
            <Text style={{ fontSize: 8, color: "#565c68", marginTop: 4 }}>L'avis de votre copilote</Text>
          </View>
        ) : null}

        {inspection.verdict || inspection.recommandation_finale ? (
          <View
            style={{
              ...pdfStyles.section,
              backgroundColor: "#f7f8fa",
              borderRadius: 8,
              padding: 12,
            }}
          >
            {inspection.verdict ? (
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: "Helvetica-Bold",
                  color: VERDICT_COLORS[inspection.verdict],
                  marginBottom: 4,
                }}
              >
                {INSPECTION_VERDICT_LABELS[inspection.verdict]}
              </Text>
            ) : null}
            {inspection.recommandation_finale ? (
              <Text style={{ fontSize: 9.5, lineHeight: 1.5 }}>{inspection.recommandation_finale}</Text>
            ) : null}
          </View>
        ) : null}

        {offre === "copilote_plus" ? (
          <View
            style={{ marginTop: 20, padding: 14, backgroundColor: "#eef3ff", borderRadius: 8 }}
            wrap={false}
          >
            <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#1a44a6", marginBottom: 4 }}>
              Et après ?
            </Text>
            <Text style={{ fontSize: 9, lineHeight: 1.5, color: "#0b0d12" }}>
              Votre copilote va maintenant se mettre en relation avec le vendeur pour finaliser l'achat, avec
              un accompagnement à chaque étape. Une fois tout validé, un convoyage sera organisé pour vous
              livrer le véhicule.
            </Text>
          </View>
        ) : null}

        <PdfFooter />
      </Page>

      {constatations.length > 0 ? (
        <Page size="A4" style={pdfStyles.page}>
          <View style={pdfStyles.header}>
            <PdfLogo />
            <Text style={{ fontSize: 8, color: "#565c68" }}>Référence {inspection.reference}</Text>
          </View>

          <Text style={pdfStyles.title}>Le détail du contrôle</Text>
          <Text style={pdfStyles.subtitle}>
            Les observations de votre copilote poste par poste, derrière les scores de la page
            précédente.
          </Text>

          {constatations.map(({ label, valeur }) => (
            <View key={label} style={{ marginBottom: 14 }} wrap={false}>
              <Text style={pdfStyles.sectionTitle}>{label}</Text>
              {splitLines(valeur).map((ligne, i) => (
                <Text key={i} style={{ fontSize: 9.5, lineHeight: 1.5, marginBottom: 2 }}>
                  {ligne}
                </Text>
              ))}
            </View>
          ))}

          <PdfFooter />
        </Page>
      ) : null}
    </Document>
  );
}
