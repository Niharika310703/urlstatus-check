import type {
  AdminOverview,
  AuthResponse,
  DashboardData,
  HistoryPoint,
  UrlInput,
  User,
} from "../types/models";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const AUTH_STORAGE_KEY = "pulseboard-auth";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let token: string | null = null;

export function readStoredAuth() {
  const value = localStorage.getItem(AUTH_STORAGE_KEY);
  return value ? (JSON.parse(value) as { token: string; user: User }) : null;
}

export function persistAuth(nextToken: string, user: User) {
  token = nextToken;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: nextToken, user }));
}

export function clearStoredAuth() {
  token = null;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function setAccessToken(nextToken: string | null) {
  token = nextToken;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});

  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(payload.message ?? "Request failed", response.status, payload.details);
  }

  return payload as T;
}

export const api = {
  signup: (email: string, password: string) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => request<{ user: User }>("/auth/me"),
  getDashboard: () => request<DashboardData>("/dashboard"),
  getUrlHistory: (urlId: string) => request<{ history: HistoryPoint[] }>(`/urls/${urlId}/history`),
  createUrls: (urls: UrlInput[]) =>
    request<{ created: Array<{ id: string }>; skipped: string[] }>("/urls/bulk", {
      method: "POST",
      body: JSON.stringify({ urls }),
    }),
  deleteUrl: (urlId: string) =>
    request<void>(`/urls/${urlId}`, {
      method: "DELETE",
    }),
  updateSchedule: (urlId: string, scheduleEnabled: boolean, intervalMinutes: number) =>
    request<{ url: { id: string } }>(`/urls/${urlId}/schedule`, {
      method: "PATCH",
      body: JSON.stringify({ scheduleEnabled, intervalMinutes }),
    }),
  runChecks: (urlIds?: string[]) =>
    request<{ requested: number; completed: number; failed: number }>("/checks/run", {
      method: "POST",
      body: JSON.stringify(urlIds ? { urlIds } : {}),
    }),
  getAdminOverview: () => request<AdminOverview>("/admin/overview"),
};
