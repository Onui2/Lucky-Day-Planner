import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

interface SajuElementRadarChartProps {
  elementBalance: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
}

export default function SajuElementRadarChart({
  elementBalance,
}: SajuElementRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart
        data={[
          { subject: "목(木)", A: elementBalance.wood, fullMark: 4 },
          { subject: "화(火)", A: elementBalance.fire, fullMark: 4 },
          { subject: "토(土)", A: elementBalance.earth, fullMark: 4 },
          { subject: "금(金)", A: elementBalance.metal, fullMark: 4 },
          { subject: "수(水)", A: elementBalance.water, fullMark: 4 },
        ]}
      >
        <PolarGrid stroke="rgba(212,175,55,0.2)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 4]}
          tick={false}
          axisLine={false}
        />
        <Radar
          dataKey="A"
          stroke="#D4AF37"
          fill="#D4AF37"
          fillOpacity={0.4}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
