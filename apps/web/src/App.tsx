import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { loading, user } = useAuth();

  if (loading) {
    return <main className="dashboard-shell"><div className="loading-card glass-card">Loading session...</div></main>;
  }

  return user ? <DashboardPage /> : <AuthPage />;
}
