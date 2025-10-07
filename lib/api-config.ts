export function getApiBaseUrl(): string {
  // For static export, environment variables must be accessed at runtime via window
  if (typeof window !== "undefined") {
    // Check if runtime config is available (injected by Cloudflare Pages)
    const runtimeEnv = (window as any).__ENV__;
    if (runtimeEnv?.NEXT_PUBLIC_IMGDOSE_API_BASE_URL) {
      return stripTrailingSlash(runtimeEnv.NEXT_PUBLIC_IMGDOSE_API_BASE_URL);
    }

    // Fallback to localhost for local development
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://127.0.0.1:8787";
    }

    // Default to production Worker URL for imgdose.pages.dev
    if (hostname.includes("imgdose") && hostname.includes("pages.dev")) {
      return "https://imgdose-api.nameless-rice-6dac.workers.dev";
    }
  }

  // Build-time fallback
  const envOverride = process.env.NEXT_PUBLIC_IMGDOSE_API_BASE_URL;
  if (envOverride && envOverride.trim().length > 0) {
    return stripTrailingSlash(envOverride.trim());
  }

  return "";
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
