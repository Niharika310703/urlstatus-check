import { useState } from "react";
import type { UrlInput } from "../types/models";

type UrlComposerProps = {
  busy: boolean;
  onSubmit: (urls: UrlInput[]) => Promise<void>;
};

function parseJsonUrls(raw: string): UrlInput[] {
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Uploaded JSON must be an array.");
  }

  return parsed as UrlInput[];
}

export function UrlComposer({ busy, onSubmit }: UrlComposerProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [jsonInput, setJsonInput] = useState('[\n  "https://www.google.com",\n  "https://www.github.com"\n]');
  const [error, setError] = useState<string | null>(null);

  const submitManualUrl = async () => {
    if (!address.trim()) {
      setError("Enter a URL first.");
      return;
    }

    setError(null);
    await onSubmit([
      {
        name: name.trim() || undefined,
        address,
        scheduleEnabled,
        intervalMinutes,
      },
    ]);
    setName("");
    setAddress("");
  };

  const submitJson = async () => {
    try {
      setError(null);
      await onSubmit(parseJsonUrls(jsonInput));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to parse JSON payload.");
    }
  };

  const importFromFile = async (file: File | null) => {
    if (!file) {
      return;
    }

    try {
      setError(null);
      const text = await file.text();
      await onSubmit(parseJsonUrls(text));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to parse uploaded JSON.");
    }
  };

  return (
    <section className="composer-grid">
      <article className="glass-card panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Manual URL</p>
            <h3>Add a live probe</h3>
          </div>
        </div>
        <label>
          Friendly name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="GitHub" />
        </label>
        <label>
          URL
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="https://status.github.com"
          />
        </label>
        <div className="inline-row">
          <label className="toggle-row">
            <input
              checked={scheduleEnabled}
              onChange={(event) => setScheduleEnabled(event.target.checked)}
              type="checkbox"
            />
            Enable schedule
          </label>
          <label>
            Interval (minutes)
            <select
              value={intervalMinutes}
              onChange={(event) => setIntervalMinutes(Number(event.target.value))}
            >
              {[1, 5, 10, 15, 30, 60].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="primary-button" disabled={busy} onClick={() => void submitManualUrl()}>
          {busy ? "Saving..." : "Add URL"}
        </button>
      </article>

      <article className="glass-card panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Bulk Import</p>
            <h3>Paste JSON or upload a file</h3>
          </div>
        </div>
        <label>
          JSON payload
          <textarea
            rows={10}
            value={jsonInput}
            onChange={(event) => setJsonInput(event.target.value)}
          />
        </label>
        <div className="inline-row actions-row">
          <button className="secondary-button" disabled={busy} onClick={() => void submitJson()}>
            Import JSON
          </button>
          <label className="file-picker">
            Upload JSON
            <input
              accept="application/json"
              onChange={(event) => void importFromFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
        </div>
        {error ? <p className="inline-error">{error}</p> : null}
      </article>
    </section>
  );
}
