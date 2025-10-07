export function getApiBaseUrl(): string {
  const envOverride = process.env.NEXT_PUBLIC_IMGDOSE_API_BASE_URL;
  if (envOverride && envOverride.trim().length > 0) {
    return stripTrailingSlash(envOverride.trim());
  }

  if (typeof window === "undefined") {
    return "";
  }

  const { hostname } = window.location;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://127.0.0.1:8787";
  }

  return stripTrailingSlash(window.location.origin);
}

export function buildApiUrl(path: string, overrideBase?: string): string {
  const base = overrideBase
    ? stripTrailingSlash(overrideBase)
    : getApiBaseUrl();
  if (!base) {
    return path;
  }
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
