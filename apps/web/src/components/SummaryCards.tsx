import type { DashboardSummary } from "../types/models";

type SummaryCardsProps = {
  summary: DashboardSummary;
};

function formatMetric(value: number, suffix = "") {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}${suffix}`;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const items = [
    {
      label: "Monitored URLs",
      value: String(summary.totalUrls),
      hint: "total endpoints in your watchlist",
    },
    {
      label: "Uptime",
      value: formatMetric(summary.uptimePercentage, "%"),
      hint: "derived from aggregated check history",
    },
    {
      label: "Failures",
      value: String(summary.failures),
      hint: "currently marked DOWN",
    },
    {
      label: "Avg latency",
      value: formatMetric(summary.averageResponseTimeMs, " ms"),
      hint: "based on latest successful samples",
    },
  ];

  return (
    <section className="summary-grid">
      {items.map((item) => (
        <article className="glass-card metric-card" key={item.label}>
          <p className="eyebrow">{item.label}</p>
          <strong>{item.value}</strong>
          <span>{item.hint}</span>
        </article>
      ))}
    </section>
  );
}
