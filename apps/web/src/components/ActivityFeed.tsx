import type { ActivityItem } from "../types/models";

type ActivityFeedProps = {
  items: ActivityItem[];
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <article className="glass-card panel activity-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Observability Feed</p>
          <h3>Recent check events</h3>
        </div>
      </div>
      <div className="activity-list">
        {items.length === 0 ? <p className="muted-text">No checks have run yet.</p> : null}
        {items.map((item) => (
          <div className="activity-item" key={item.id}>
            <div>
              <strong>{item.urlName}</strong>
              <p className="muted-text">{item.address}</p>
            </div>
            <div className="activity-meta">
              <span className={`status-pill ${item.status === "UP" ? "status-up" : "status-down"}`}>
                {item.status}
              </span>
              <span>{item.responseTimeMs ?? "--"} ms</span>
              <span>{new Date(item.checkedAt).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
