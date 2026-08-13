import { View, Text, Svg, Circle } from "@react-pdf/renderer";

interface Props {
  value: number;
  size?: number;
  fontSize?: number;
}

export function ScoreRing({ value, size = 60, fontSize = 13 }: Props) {
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
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{ fontSize, fontFamily: "Helvetica-Bold", color: "#0b0d12" }}>{value}</Text>
    </View>
  );
}
