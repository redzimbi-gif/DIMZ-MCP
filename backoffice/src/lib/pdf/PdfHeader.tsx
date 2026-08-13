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

export function PdfFooter() {
  return (
    <View style={pdfStyles.footer} fixed>
      <Text style={pdfStyles.footerBrand}>Trouver · Sécuriser · Accompagner · Livrer</Text>
      <Text style={pdfStyles.footerMeta}>
        Dimz — Mon Copilote Auto · Document généré automatiquement le{" "}
        {new Date().toLocaleDateString("fr-FR")}
      </Text>
    </View>
  );
}
