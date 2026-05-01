import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import {
  api,
  clearStoredAuth,
  persistAuth,
  readStoredAuth,
  setAccessToken,
} from "../api/client";
import type { User } from "../types/models";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const stored = readStoredAuth();

      if (!stored) {
        setLoading(false);
        return;
      }

      setAccessToken(stored.token);
      setToken(stored.token);

      try {
        const response = await api.getMe();
        setUser(response.user);
        persistAuth(stored.token, response.user);
      } catch (error) {
        clearStoredAuth();
        setAccessToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void restoreSession();
  }, []);

  const handleAuthResult = (nextToken: string, nextUser: User) => {
    setAccessToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    persistAuth(nextToken, nextUser);
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    handleAuthResult(response.token, response.user);
  };

  const signup = async (email: string, password: string) => {
    const response = await api.signup(email, password);
    handleAuthResult(response.token, response.user);
  };

  const logout = () => {
    clearStoredAuth();
    setAccessToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
