import { View, Text, Svg, Path, Circle } from "@react-pdf/renderer";
import { pdfStyles } from "./theme";

export function PdfLogo() {
  return (
    <View style={pdfStyles.logoRow}>
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={10.5} stroke="#2f6fed" strokeWidth={1.6} fill="none" />
        <Path
          d="M8 15.5V9.2c0-.4.32-.7.72-.7h3.9c1.86 0 3.38 1.44 3.38 3.5s-1.52 3.5-3.38 3.5H8Z"
          stroke="#2f6fed"
          strokeWidth={1.6}
          fill="none"
        />
      </Svg>
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
