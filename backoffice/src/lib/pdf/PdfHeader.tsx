import { View, Text, Image } from "@react-pdf/renderer";
import { pdfStyles } from "./theme";
import { DIMZ_LOGO_DATA_URI } from "./logo";

export function PdfLogo() {
  return (
    <View style={pdfStyles.logoRow}>
      <Image src={DIMZ_LOGO_DATA_URI} style={{ width: 20, height: 20 }} />
      <Text style={pdfStyles.brand}>Dimz</Text>
    </View>
  );
}

export function PdfFooter() {
  return (
    <Text style={pdfStyles.footer} fixed>
      Dimz — Mon copilote auto · Document généré automatiquement le{" "}
      {new Date().toLocaleDateString("fr-FR")}
    </Text>
  );
}
