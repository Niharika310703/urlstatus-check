import { useEffect, useEffectEvent, useState } from "react";
import { io } from "socket.io-client";
import { ApiError, api } from "../api/client";
import { ActivityFeed } from "../components/ActivityFeed";
import { ResponseChart } from "../components/ResponseChart";
import { SummaryCards } from "../components/SummaryCards";
import { TrendChart } from "../components/TrendChart";
import { UrlComposer } from "../components/UrlComposer";
import { UrlTable } from "../components/UrlTable";
import { useAuth } from "../context/AuthContext";
import type { AdminOverview, DashboardData, HistoryPoint, UrlInput } from "../types/models";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

export function DashboardPage() {
  const { user, token, logout } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [selectedUrlId, setSelectedUrlId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);

  const selectedUrl =
    dashboard?.urls.find((url) => url.id === selectedUrlId) ?? dashboard?.urls[0] ?? null;

  const loadDashboard = async () => {
    const nextDashboard = await api.getDashboard();
    setDashboard(nextDashboard);
    setSelectedUrlId((current) => {
      if (current && nextDashboard.urls.some((url) => url.id === current)) {
        return current;
      }
      return nextDashboard.urls[0]?.id ?? null;
    });
  };

  const loadHistory = async (urlId: string) => {
    const response = await api.getUrlHistory(urlId);
    setHistory(response.history);
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await loadDashboard();
        if (user?.role === "ADMIN") {
          const overview = await api.getAdminOverview();
          setAdminOverview(overview);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }
        setNotice(error instanceof Error ? error.message : "Unable to load dashboard.");
      }
    };

    void bootstrap();
  }, [user?.role]);

  useEffect(() => {
    if (!selectedUrlId) {
      setHistory([]);
      return;
    }

    void loadHistory(selectedUrlId);
  }, [selectedUrlId]);

  const handleRealtimeUpdate = useEffectEvent((nextDashboard: DashboardData) => {
    setDashboard(nextDashboard);
    const nextSelectedUrlId =
      selectedUrlId && nextDashboard.urls.some((url) => url.id === selectedUrlId)
        ? selectedUrlId
        : nextDashboard.urls[0]?.id ?? null;
    setSelectedUrlId(nextSelectedUrlId);
    if (nextSelectedUrlId) {
      void loadHistory(nextSelectedUrlId);
    }
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("monitor:update", handleRealtimeUpdate);
    socket.on("connect_error", () => {
      setNotice("Realtime updates are unavailable. Manual refresh still works.");
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const runChecks = async (urlId?: string) => {
    try {
      setBusy(true);
      setNotice(null);
      await api.runChecks(urlId ? [urlId] : undefined);
      setNotice(urlId ? "Manual check completed." : "All checks completed.");
      await loadDashboard();
      if (urlId) {
        await loadHistory(urlId);
      } else if (selectedUrlId) {
        await loadHistory(selectedUrlId);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to run checks.");
    } finally {
      setBusy(false);
    }
  };

  const addUrls = async (urls: UrlInput[]) => {
    try {
      setBusy(true);
      const response = await api.createUrls(urls);
      await loadDashboard();
      setNotice(
        response.skipped.length > 0
          ? `Added ${response.created.length} URL(s), skipped ${response.skipped.length} duplicate(s).`
          : `Added ${response.created.length} URL(s).`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to add URLs.");
    } finally {
      setBusy(false);
    }
  };

  const updateSchedule = async (urlId: string, scheduleEnabled: boolean, intervalMinutes: number) => {
    try {
      setBusy(true);
      await api.updateSchedule(urlId, scheduleEnabled, intervalMinutes);
      await loadDashboard();
      setNotice(
        scheduleEnabled
          ? `Schedule saved at every ${intervalMinutes} minute(s).`
          : "Schedule disabled.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update schedule.");
    } finally {
      setBusy(false);
    }
  };

  const removeUrl = async (urlId: string) => {
    try {
      setBusy(true);
      await api.deleteUrl(urlId);
      await loadDashboard();
      setNotice("URL removed.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to remove URL.");
    } finally {
      setBusy(false);
    }
  };

  if (!dashboard || !user) {
    return <main className="dashboard-shell"><div className="loading-card glass-card">Loading dashboard...</div></main>;
  }

  return (
    <main className="dashboard-shell">
      <section className="hero-bar glass-card">
        <div>
          <p className="eyebrow">Realtime Operations</p>
          <h1>PulseBoard</h1>
          <p>
            Signed in as {user.email}. Track uptime, latency, and failure bursts from one command
            center.
          </p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" disabled={busy} onClick={() => void loadDashboard()}>
            Refresh
          </button>
          <button className="primary-button" onClick={logout}>
            Logout
          </button>
        </div>
      </section>

      {notice ? <div className="notice-banner glass-card">{notice}</div> : null}

      <SummaryCards summary={dashboard.summary} />

      {adminOverview ? (
        <section className="admin-strip glass-card">
          <span>Admin scope</span>
          <strong>{adminOverview.users} users</strong>
          <strong>{adminOverview.monitoredUrls} URLs</strong>
          <strong>{adminOverview.checks} checks</strong>
        </section>
      ) : null}

      <UrlComposer busy={busy} onSubmit={addUrls} />

      <UrlTable
        onDelete={removeUrl}
        onRun={runChecks}
        onSelect={setSelectedUrlId}
        onUpdateSchedule={updateSchedule}
        selectedUrlId={selectedUrlId}
        urls={dashboard.urls}
      />

      <section className="chart-grid">
        <TrendChart points={dashboard.dailyTrend} />
        <ResponseChart history={history} url={selectedUrl} />
      </section>

      <ActivityFeed items={dashboard.recentActivity} />
    </main>
  );
}
