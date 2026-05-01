import { useState } from "react";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function AuthPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("Admin123!");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    try {
      setBusy(true);
      setError(null);
      if (mode === "login") {
        await login(email, password);
        return;
      }
      await signup(email, password);
    } catch (nextError) {
      if (nextError instanceof ApiError) {
        setError(nextError.message);
      } else if (nextError instanceof Error) {
        setError(nextError.message);
      } else {
        setError("Authentication failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <p className="eyebrow">URL Health & Observability Platform</p>
        <h1>PulseBoard</h1>
        <p>
          Monitor status codes, latency drift, scheduled checks, and operational events from a single
          live dashboard.
        </p>
        <div className="hero-stats">
          <div>
            <strong>Concurrent</strong>
            <span>Promise-based check execution</span>
          </div>
          <div>
            <strong>Realtime</strong>
            <span>Socket.IO dashboard refresh</span>
          </div>
          <div>
            <strong>Structured</strong>
            <span>JSON logs with correlation IDs</span>
          </div>
        </div>
      </section>

      <section className="auth-card glass-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Secure Access</p>
            <h3>{mode === "login" ? "Sign in" : "Create account"}</h3>
          </div>
        </div>
        <div className="mode-toggle">
          <button
            className={mode === "login" ? "primary-button" : "secondary-button"}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={mode === "signup" ? "primary-button" : "secondary-button"}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
          />
        </label>
        <button className="primary-button" disabled={busy} onClick={() => void submit()}>
          {busy ? "Working..." : mode === "login" ? "Enter dashboard" : "Create account"}
        </button>
        {error ? <p className="inline-error">{error}</p> : null}
      </section>
    </main>
  );
}
