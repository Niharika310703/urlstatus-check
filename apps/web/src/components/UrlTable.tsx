import type { MonitorStatus, MonitoredUrl } from "../types/models";

type UrlTableProps = {
  urls: MonitoredUrl[];
  selectedUrlId: string | null;
  onSelect: (urlId: string) => void;
  onRun: (urlId?: string) => Promise<void>;
  onDelete: (urlId: string) => Promise<void>;
  onUpdateSchedule: (urlId: string, scheduleEnabled: boolean, intervalMinutes: number) => Promise<void>;
};

function statusClass(status: MonitorStatus) {
  if (status === "UP") {
    return "status-up";
  }

  if (status === "DOWN") {
    return "status-down";
  }

  return "status-unknown";
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

export function UrlTable({
  urls,
  selectedUrlId,
  onSelect,
  onRun,
  onDelete,
  onUpdateSchedule,
}: UrlTableProps) {
  if (urls.length === 0) {
    return (
      <article className="glass-card panel empty-panel">
        <p className="eyebrow">No Monitors Yet</p>
        <h3>Your watchlist is empty</h3>
        <p>Add a URL manually or import a JSON array to start collecting health checks.</p>
      </article>
    );
  }

  return (
    <article className="glass-card panel table-panel">
      <div className="panel-heading panel-heading-row">
        <div>
          <p className="eyebrow">Monitored URLs</p>
          <h3>Live watchlist</h3>
        </div>
        <button className="secondary-button" onClick={() => void onRun()}>
          Run all checks
        </button>
      </div>
      <div className="table-list">
        {urls.map((url) => (
          <div
            className={`table-row ${selectedUrlId === url.id ? "table-row-active" : ""}`}
            key={url.id}
            onClick={() => onSelect(url.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(url.id);
              }
            }}
          >
            <div>
              <div className="row-title">
                <strong>{url.name}</strong>
                <span className={`status-pill ${statusClass(url.lastStatus)}`}>{url.lastStatus}</span>
              </div>
              <p className="muted-text">{url.address}</p>
            </div>
            <div className="row-stats">
              <span>Latency: {url.lastResponseTimeMs ?? "--"} ms</span>
              <span>Last check: {formatDate(url.lastCheckedAt)}</span>
            </div>
            <div className="row-schedule">
              <label className="toggle-row" onClick={(event) => event.stopPropagation()}>
                <input
                  checked={url.scheduleEnabled}
                  onChange={(event) =>
                    void onUpdateSchedule(url.id, event.target.checked, url.intervalMinutes)
                  }
                  type="checkbox"
                />
                Schedule
              </label>
              <select
                onClick={(event) => event.stopPropagation()}
                value={url.intervalMinutes}
                onChange={(event) =>
                  void onUpdateSchedule(url.id, url.scheduleEnabled, Number(event.target.value))
                }
              >
                {[1, 5, 10, 15, 30, 60].map((value) => (
                  <option key={value} value={value}>
                    {value} min
                  </option>
                ))}
              </select>
              <button
                className="ghost-button"
                onClick={(event) => {
                  event.stopPropagation();
                  void onRun(url.id);
                }}
              >
                Run now
              </button>
              <button
                className="ghost-button danger-button"
                onClick={(event) => {
                  event.stopPropagation();
                  void onDelete(url.id);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
