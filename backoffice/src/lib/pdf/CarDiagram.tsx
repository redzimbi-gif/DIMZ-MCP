import { View, Text, Svg, Rect, Line, Path } from "@react-pdf/renderer";

var BODY_PATH =
  "M100,8 " +
  "C128,8 148,14 158,28 " +
  "C170,44 176,54 174,72 " +
  "C172,90 168,100 166,120 " +
  "L166,300 " +
  "C168,320 172,330 174,348 " +
  "C176,366 170,376 158,392 " +
  "C148,406 128,412 100,412 " +
  "C72,412 52,406 42,392 " +
  "C30,376 24,366 26,348 " +
  "C28,330 32,320 34,300 " +
  "L34,120 " +
  "C32,100 28,90 26,72 " +
  "C24,54 30,44 42,28 " +
  "C52,14 72,8 100,8 Z";

/**
 * Schéma à plat (vue de dessus) d'une voiture générique, pensé pour être
 * imprimé : l'utilisateur marque les dommages constatés directement dessus
 * au stylo (une croix sur un impact, un trait sur une rayure).
 */
export function CarDiagram({ width = 170 }: { width?: number }) {
  const height = width * (440 / 200);
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 7, color: "#8a909c", marginBottom: 2, textAlign: "center" }}>AVANT</Text>
      <Svg width={width} height={height} viewBox="0 0 200 440">
        {/* Carrosserie */}
        <Path d={BODY_PATH} stroke="#0b0d12" strokeWidth={1.5} fill="none" />
        {/* Pare-brise avant */}
        <Path d="M60,100 L140,100 L122,140 L78,140 Z" stroke="#0b0d12" strokeWidth={1} fill="none" />
        {/* Pavillon / toit */}
        <Rect x={70} y={140} width={60} height={140} rx={14} stroke="#0b0d12" strokeWidth={1} fill="none" />
        {/* Lunette arrière */}
        <Path d="M78,280 L122,280 L140,320 L60,320 Z" stroke="#0b0d12" strokeWidth={1} fill="none" />
        {/* Rétroviseurs */}
        <Rect x={16} y={104} width={16} height={9} rx={2} stroke="#0b0d12" strokeWidth={1} fill="none" />
        <Rect x={168} y={104} width={16} height={9} rx={2} stroke="#0b0d12" strokeWidth={1} fill="none" />
        {/* Roues */}
        <Rect x={9} y={56} width={14} height={48} rx={4} stroke="#0b0d12" strokeWidth={1} fill="none" />
        <Rect x={177} y={56} width={14} height={48} rx={4} stroke="#0b0d12" strokeWidth={1} fill="none" />
        <Rect x={9} y={318} width={14} height={48} rx={4} stroke="#0b0d12" strokeWidth={1} fill="none" />
        <Rect x={177} y={318} width={14} height={48} rx={4} stroke="#0b0d12" strokeWidth={1} fill="none" />
        {/* Repères portières */}
        <Line x1={26} y1={175} x2={40} y2={175} stroke="#0b0d12" strokeWidth={0.75} />
        <Line x1={160} y1={175} x2={174} y2={175} stroke="#0b0d12" strokeWidth={0.75} />
        <Line x1={26} y1={245} x2={40} y2={245} stroke="#0b0d12" strokeWidth={0.75} />
        <Line x1={160} y1={245} x2={174} y2={245} stroke="#0b0d12" strokeWidth={0.75} />
      </Svg>
      <Text style={{ fontSize: 7, color: "#8a909c", marginTop: 2, textAlign: "center" }}>ARRIÈRE</Text>
    </View>
  );
}

export function CarDiagramLegend() {
  return (
    <Text style={{ fontSize: 7.5, color: "#565c68", lineHeight: 1.5, textAlign: "center", marginTop: 4 }}>
      À l'impression : notez un dommage par une croix (✗) à l'endroit concerné, ou entourez d'un trait la zone
      touchée (rayure, choc, éclat…).
    </Text>
  );
}
