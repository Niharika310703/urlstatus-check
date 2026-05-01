export type Role = "USER" | "ADMIN";
export type MonitorStatus = "UP" | "DOWN" | "UNKNOWN";
export type FailureReason = "INVALID_URL" | "TIMEOUT" | "DNS" | "HTTP_ERROR" | "UNKNOWN_ERROR";

export type User = {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
};

export type DashboardSummary = {
  totalUrls: number;
  failures: number;
  activeSchedules: number;
  uptimePercentage: number;
  averageResponseTimeMs: number;
};

export type MonitoredUrl = {
  id: string;
  name: string;
  address: string;
  scheduleEnabled: boolean;
  intervalMinutes: number;
  nextCheckAt: string | null;
  lastStatus: MonitorStatus;
  lastResponseTimeMs: number | null;
  lastCheckedAt: string | null;
  createdAt: string;
};

export type DailyTrendPoint = {
  date: string;
  uptimePercentage: number;
  avgResponseTimeMs: number;
  failureCount: number;
  totalChecks: number;
};

export type ActivityItem = {
  id: string;
  urlId: string;
  urlName: string;
  address: string;
  status: MonitorStatus;
  httpStatus: number | null;
  responseTimeMs: number | null;
  checkedAt: string;
  errorMessage: string | null;
  failureReason: FailureReason | null;
};

export type HistoryPoint = {
  id: string;
  status: MonitorStatus;
  httpStatus: number | null;
  responseTimeMs: number | null;
  checkedAt: string;
  errorMessage: string | null;
  failureReason: FailureReason | null;
  correlationId: string;
};

export type DashboardData = {
  summary: DashboardSummary;
  urls: MonitoredUrl[];
  dailyTrend: DailyTrendPoint[];
  recentActivity: ActivityItem[];
};

export type UrlInput =
  | string
  | {
      name?: string;
      address: string;
      scheduleEnabled?: boolean;
      intervalMinutes?: number;
    };

export type AuthResponse = {
  token: string;
  user: User;
};

export type AdminOverview = {
  users: number;
  monitoredUrls: number;
  checks: number;
};
