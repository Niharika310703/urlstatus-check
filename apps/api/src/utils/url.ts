import { AppError } from "../middleware/errorHandler";

export function normalizeUrl(rawUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl.trim());
  } catch (error) {
    throw new AppError(400, `Invalid URL: ${rawUrl}`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new AppError(400, `Only HTTP and HTTPS URLs are supported: ${rawUrl}`);
  }

  parsed.hash = "";

  const normalized = parsed.toString();
  return normalized.endsWith("/") && parsed.pathname === "/" ? normalized.slice(0, -1) : normalized;
}

export function deriveNameFromUrl(address: string) {
  const parsed = new URL(address);
  return parsed.hostname.replace(/^www\./, "");
}
