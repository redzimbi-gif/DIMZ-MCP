import { View, Text, Image } from "@react-pdf/renderer";
import { pdfStyles } from "./theme";
import { DIMZ_LOGO_DATA_URI } from "./logo";

export function PdfLogo() {
  return (
    <View style={pdfStyles.logoRow}>
      <Image src={DIMZ_LOGO_DATA_URI} style={{ width: 16, height: 16 }} />
      <Text style={pdfStyles.brand}>
        DIMZ<Text style={pdfStyles.brandSuffix}> - Mon Copilote Auto</Text>
      </Text>
    </View>
  );
}

interface EntrepriseLegal {
  nom_dirigeant?: string | null;
  siret?: string | null;
}

export function PdfFooter({ entreprise }: { entreprise?: EntrepriseLegal | null } = {}) {
  return (
    <View style={pdfStyles.footer} fixed>
      <View style={pdfStyles.footerBrandRow}>
        <Image src={DIMZ_LOGO_DATA_URI} style={{ width: 11, height: 11 }} />
        <Text style={pdfStyles.footerBrand}>DIMZ - Mon Copilote Auto</Text>
      </View>
      <Text style={pdfStyles.footerSlogan}>Trouver · Sécuriser · Accompagner · Livrer</Text>
      {entreprise ? (
        <Text style={pdfStyles.footerLegal}>
          {entreprise.nom_dirigeant || "DIMZ - Mon Copilote Auto"}
          {entreprise.siret ? ` · SIRET ${entreprise.siret}` : ""} · TVA non applicable, art. 293 B du CGI
        </Text>
      ) : null}
      <Text style={pdfStyles.footerMeta}>
        Document généré automatiquement le {new Date().toLocaleDateString("fr-FR")}
      </Text>
    </View>
  );
}
