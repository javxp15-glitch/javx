type HeaderReader = {
  get(name: string): string | null | undefined
}

export function resolveAppOriginFromHeaders(
  headers: HeaderReader,
  fallbackOrigin: string,
  configuredOrigin = ""
): string {
  const rawHost = headers.get("x-forwarded-host")?.trim() || headers.get("host")?.trim() || ""
  const host = normalizeHostForBrowser(rawHost || safeOriginHost(fallbackOrigin) || "localhost")
  const protocolHeader = headers.get("x-forwarded-proto")?.trim()
  const protocol = protocolHeader || (isLocalLikeHost(host) ? "http" : safeOriginProtocol(fallbackOrigin) || "https")
  const requestOrigin = `${protocol}://${host}`

  if (isLocalLikeHost(rawHost || host)) {
    return requestOrigin
  }

  return normalizeConfiguredOrigin(configuredOrigin) || requestOrigin
}

export function normalizeConfiguredOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "")
  if (!trimmed || trimmed.includes("0.0.0.0")) {
    return ""
  }

  try {
    const parsed = new URL(trimmed)
    parsed.host = normalizeHostForBrowser(parsed.host)
    return parsed.origin
  } catch {
    return trimmed
      .replace(/^https?:\/\/host\.docker\.internal/i, (match) => match.replace("host.docker.internal", "localhost"))
      .replace(/^https?:\/\/127\.0\.0\.1/i, (match) => match.replace("127.0.0.1", "localhost"))
  }
}

export function normalizeHostForBrowser(host: string): string {
  return host
    .replace(/^0\.0\.0\.0(?=[:/]|$)/i, "localhost")
    .replace(/^127\.0\.0\.1(?=[:/]|$)/i, "localhost")
    .replace(/^host\.docker\.internal(?=[:/]|$)/i, "localhost")
}

function isLocalLikeHost(host: string): boolean {
  const normalized = normalizeHostForBrowser(host).toLowerCase()
  return normalized.startsWith("localhost")
}

function safeOriginHost(origin: string): string {
  try {
    return new URL(origin).host
  } catch {
    return ""
  }
}

function safeOriginProtocol(origin: string): string {
  try {
    return new URL(origin).protocol.replace(":", "")
  } catch {
    return ""
  }
}
