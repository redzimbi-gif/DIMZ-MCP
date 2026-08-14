import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { pdfStyles } from "./theme";
import { PdfLogo, PdfFooter } from "./PdfHeader";
import { formatCurrency } from "@/lib/format";
import type { FicheDecouverteVehicule } from "@/lib/types";

type FicheVehiculeAvecPhoto = FicheDecouverteVehicule & { photoUrl?: string | null };

interface Props {
  vehicules: FicheVehiculeAvecPhoto[];
  commentaire?: string | null;
  dossierReference: string;
  clientNom: string;
}

const DEFAULT_INTRO =
  "Votre copilote a fait le tour du marché pour vous — voici ce qu'il en retient, sans détour. Pas de " +
  "note chiffrée à ce stade : juste un point fort et un point de vigilance par véhicule, pour vous aider " +
  "à y voir clair avant d'aller plus loin.";

export function FicheDecouverteReport({ vehicules, commentaire, dossierReference, clientNom }: Props) {
  return (
    <Document title={`Fiche Découverte — ${dossierReference}`}>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <PdfLogo />
          <Text style={{ fontSize: 8, color: "#565c68" }}>Référence {dossierReference}</Text>
        </View>

        <Text style={pdfStyles.title}>Fiche Découverte</Text>
        <Text style={pdfStyles.subtitle}>
          {dossierReference} — {clientNom}
        </Text>

        <View style={{ ...pdfStyles.section, borderLeft: "2px solid #2f6fed", paddingLeft: 12, marginBottom: commentaire?.trim() ? 10 : 20 }}>
          <Text style={{ fontSize: 9.5, lineHeight: 1.5, color: "#0b0d12" }}>{DEFAULT_INTRO}</Text>
        </View>

        {commentaire?.trim() ? (
          <View style={{ ...pdfStyles.section, marginBottom: 20 }}>
            <Text style={{ fontSize: 9.5, lineHeight: 1.5, color: "#0b0d12" }}>{commentaire.trim()}</Text>
          </View>
        ) : null}

        {vehicules.map((v, i) => (
          <View
            key={v.id}
            style={{
              flexDirection: "row",
              gap: 10,
              marginBottom: 12,
              padding: 12,
              backgroundColor: "#f7f8fa",
              borderRadius: 8,
            }}
            wrap={false}
          >
            {v.photoUrl ? (
              <Image src={v.photoUrl} style={{ width: 64, height: 64, borderRadius: 6, objectFit: "cover" }} />
            ) : null}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>
                  {[v.marque, v.modele].filter(Boolean).join(" ") || `Véhicule ${i + 1}`}
                </Text>
                {v.energie ? (
                  <Text
                    style={{
                      fontSize: 7.5,
                      color: "#2f6fed",
                      backgroundColor: "#eef3ff",
                      borderRadius: 8,
                      paddingVertical: 3,
                      paddingHorizontal: 7,
                    }}
                  >
                    {v.energie}
                  </Text>
                ) : null}
              </View>
              {v.prix_min && v.prix_max ? (
                <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#2f6fed", marginBottom: 6 }}>
                  Entre {formatCurrency(v.prix_min)} et {formatCurrency(v.prix_max)}
                </Text>
              ) : v.prix_min || v.prix_max ? (
                <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#2f6fed", marginBottom: 6 }}>
                  Environ {formatCurrency((v.prix_min ?? v.prix_max)!)}
                </Text>
              ) : null}
              {v.point_fort ? (
                <Text style={{ fontSize: 9, lineHeight: 1.5, color: "#1a9e6b", marginBottom: 3 }}>
                  + {v.point_fort}
                </Text>
              ) : null}
              {v.point_vigilance ? (
                <Text style={{ fontSize: 9, lineHeight: 1.5, color: "#b5780a" }}>! {v.point_vigilance}</Text>
              ) : null}
            </View>
          </View>
        ))}

        <View style={{ flexGrow: 1 }} />

        <View
          style={{
            marginTop: 20,
            padding: 14,
            backgroundColor: "#eef3ff",
            borderRadius: 8,
          }}
          wrap={false}
        >
          <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#1a44a6", marginBottom: 4 }}>
            Envie d'aller plus loin ?
          </Text>
          <Text style={{ fontSize: 9, lineHeight: 1.5, color: "#0b0d12" }}>
            Avec l'offre Copilote, votre copilote pousse la recherche plus loin : analyse détaillée de chaque
            annonce, score DIMZ, rapport écrit et appel de synthèse. Avec Copilote Plus, il vous accompagne
            jusqu'à la remise des clés : mise en relation avec le vendeur, inspection complète, livraison et
            démarches administratives incluses.
          </Text>
        </View>

        <PdfFooter />
      </Page>
    </Document>
  );
}
