import { View, Text, Svg, Circle } from "@react-pdf/renderer";

interface Props {
  value: number;
  size?: number;
  fontSize?: number;
  /**
   * Mention de l'échelle sous la note, par exemple « / 10 ». Le site affiche
   * « 8,2 / 10 » : une note nue se lit mal, surtout quand le barème n'est pas
   * rappelé à côté.
   */
  suffix?: string;
}

/**
 * Nombre à la française : la virgule décimale. `String(8.2)` donne « 8.2 »,
 * qui jure dans un document en français — et le site écrit bien « 8,2 ».
 */
function formatNote(value: number): string {
  return String(value).replace(".", ",");
}

export function ScoreRing({ value, size = 60, fontSize = 13, suffix }: Props) {
  const strokeWidth = size >= 50 ? 5 : 4;
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(10, value)) / 10) * circumference;
  const center = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute" }}>
        <Circle cx={center} cy={center} r={radius} stroke="#e6e8ee" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#2f6fed"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${filled}, ${circumference}`}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize, fontFamily: "Helvetica-Bold", color: "#0b0d12" }}>{formatNote(value)}</Text>
        {suffix ? (
          <Text style={{ fontSize: Math.max(5.5, fontSize * 0.5), color: "#565c68", marginTop: -1 }}>
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
