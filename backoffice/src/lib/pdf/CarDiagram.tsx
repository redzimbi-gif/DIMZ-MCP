import { View, Text, Svg, Rect, Line, Path } from "@react-pdf/renderer";

/**
 * Schéma à plat (vue de dessus) d'une voiture générique, pensé pour être
 * imprimé : l'utilisateur marque les dommages constatés directement dessus
 * au stylo (une croix sur un impact, un trait sur une rayure).
 */
export function CarDiagram({ width = 170 }: { width?: number }) {
  const height = width * (380 / 180);
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 7, color: "#8a909c", marginBottom: 2, textAlign: "center" }}>AVANT</Text>
      <Svg width={width} height={height} viewBox="0 0 180 380">
        {/* Carrosserie */}
        <Rect x={20} y={10} width={140} height={360} rx={35} ry={35} stroke="#0b0d12" strokeWidth={1.5} fill="none" />
        {/* Pare-brise avant */}
        <Path d="M 40 55 L 140 55 L 125 100 L 55 100 Z" stroke="#0b0d12" strokeWidth={1} fill="none" />
        {/* Pavillon / toit */}
        <Rect x={55} y={100} width={70} height={140} rx={10} stroke="#0b0d12" strokeWidth={1} fill="none" />
        {/* Lunette arrière */}
        <Path d="M 55 240 L 125 240 L 140 285 L 40 285 Z" stroke="#0b0d12" strokeWidth={1} fill="none" />
        {/* Pare-chocs avant / arrière */}
        <Line x1={20} y1={55} x2={160} y2={55} stroke="#0b0d12" strokeWidth={1} />
        <Line x1={20} y1={325} x2={160} y2={325} stroke="#0b0d12" strokeWidth={1} />
        {/* Rétroviseurs */}
        <Rect x={6} y={94} width={16} height={9} rx={2} stroke="#0b0d12" strokeWidth={1} fill="none" />
        <Rect x={158} y={94} width={16} height={9} rx={2} stroke="#0b0d12" strokeWidth={1} fill="none" />
        {/* Roues */}
        <Rect x={4} y={68} width={13} height={48} rx={4} stroke="#0b0d12" strokeWidth={1} fill="none" />
        <Rect x={163} y={68} width={13} height={48} rx={4} stroke="#0b0d12" strokeWidth={1} fill="none" />
        <Rect x={4} y={264} width={13} height={48} rx={4} stroke="#0b0d12" strokeWidth={1} fill="none" />
        <Rect x={163} y={264} width={13} height={48} rx={4} stroke="#0b0d12" strokeWidth={1} fill="none" />
        {/* Repères portières */}
        <Line x1={20} y1={150} x2={50} y2={150} stroke="#0b0d12" strokeWidth={0.75} />
        <Line x1={130} y1={150} x2={160} y2={150} stroke="#0b0d12" strokeWidth={0.75} />
        <Line x1={20} y1={225} x2={50} y2={225} stroke="#0b0d12" strokeWidth={0.75} />
        <Line x1={130} y1={225} x2={160} y2={225} stroke="#0b0d12" strokeWidth={0.75} />
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
