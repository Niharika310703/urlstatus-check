import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryPoint, MonitoredUrl } from "../types/models";

type ResponseChartProps = {
  url: MonitoredUrl | null;
  history: HistoryPoint[];
};

function toChartData(history: HistoryPoint[]) {
  return history.map((point) => ({
    time: new Date(point.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    responseTimeMs: point.responseTimeMs ?? 0,
    status: point.status,
  }));
}

export function ResponseChart({ url, history }: ResponseChartProps) {
  return (
    <article className="glass-card panel chart-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Selected URL</p>
          <h3>{url ? `${url.name} latency profile` : "Choose a URL to inspect"}</h3>
        </div>
      </div>
      <div className="chart-frame">
        {url ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={toChartData(history)}>
              <CartesianGrid stroke="#274348" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" stroke="#98b8b6" />
              <YAxis stroke="#98b8b6" />
              <Tooltip />
              <Line
                dataKey="responseTimeMs"
                name="Latency (ms)"
                stroke="#ffb36b"
                strokeWidth={3}
                dot={{ fill: "#ffb36b", strokeWidth: 0, r: 3 }}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-chart">No URL selected.</div>
        )}
      </div>
    </article>
  );
}
