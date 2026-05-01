import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyTrendPoint } from "../types/models";

type TrendChartProps = {
  points: DailyTrendPoint[];
};

export function TrendChart({ points }: TrendChartProps) {
  return (
    <article className="glass-card panel chart-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Historical Trend</p>
          <h3>Daily uptime and failures</h3>
        </div>
      </div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points}>
            <defs>
              <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1d8f78" stopOpacity={0.75} />
                <stop offset="95%" stopColor="#1d8f78" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#274348" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" stroke="#98b8b6" />
            <YAxis stroke="#98b8b6" />
            <Tooltip />
            <Area
              dataKey="uptimePercentage"
              fill="url(#uptimeGradient)"
              name="Uptime %"
              stroke="#53d1b6"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
