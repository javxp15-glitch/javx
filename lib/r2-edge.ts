// Edge-compatible R2 utilities (no Node.js modules like 'fs')
// Use this in Edge Runtime routes instead of lib/r2.ts

type R2Config = {
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicDomain?: string;
};

const R2_KEY_PREFIX = "media-storage";

function normalizeEndpoint(endpoint: string, bucketName: string): string {
    try {
        const parsed = new URL(endpoint);
        const cleanPath = parsed.pathname.replace(/\/+$/, "");
        const bucketSuffix = `/${bucketName}`.toLowerCase();
        if (cleanPath.toLowerCase().endsWith(bucketSuffix)) {
            const nextPath = cleanPath.slice(0, -bucketSuffix.length) || "/";
            parsed.pathname = nextPath;
        } else {
            parsed.pathname = cleanPath || "/";
        }
        return parsed.toString().replace(/\/$/, "");
    } catch {
        return endpoint.replace(/\/+$/, "");
    }
}

export function getR2Config(): R2Config {
    const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_DOMAIN } = process.env;
    const missing = [
        !R2_ENDPOINT && "R2_ENDPOINT",
        !R2_ACCESS_KEY_ID && "R2_ACCESS_KEY_ID",
        !R2_SECRET_ACCESS_KEY && "R2_SECRET_ACCESS_KEY",
        !R2_BUCKET_NAME && "R2_BUCKET_NAME",
    ].filter(Boolean) as string[];

    if (missing.length > 0) {
        throw new Error(`Missing R2 configuration: ${missing.join(", ")}`);
    }

    return {
        endpoint: normalizeEndpoint(R2_ENDPOINT!, R2_BUCKET_NAME!),
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
        bucketName: R2_BUCKET_NAME!,
        publicDomain: R2_PUBLIC_DOMAIN,
    };
}

export function getPublicR2Url(key: string): string {
    const config = getR2Config();
    let base = `${config.endpoint}/${config.bucketName}`;
    if (config.publicDomain) {
        try {
            const parsed = new URL(config.publicDomain);
            base = parsed.origin;
        } catch {
            base = config.publicDomain.replace(/\/+$/, "");
        }
    }
    return `${base}/${key}`;
}

/**
 * Extract R2 key from any R2 URL format (signed or direct)
 */
function extractR2KeyFromUrl(url: string): string | null {
    if (!url) return null;

    const r2Patterns = [
        /r2\.cloudflarestorage\.com/i,
        /r2\.dev/i,
    ];

    const isR2Url = r2Patterns.some(pattern => pattern.test(url));
    if (!isR2Url) return null;

    const withoutQuery = url.split("?")[0]?.split("#")[0] ?? "";

    try {
        const parsed = new URL(withoutQuery.startsWith("//") ? `https:${withoutQuery}` : withoutQuery);
        const path = parsed.pathname.replace(/^\/+/, "");
        if (!path) return null;

        try {
            const config = getR2Config();
            const bucketPrefix = `${config.bucketName}/`;
            if (path.startsWith(bucketPrefix)) {
                return path.slice(bucketPrefix.length);
            }
        } catch {
            // Ignore config errors
        }

        return path;
    } catch {
        return null;
    }
}

export function normalizeR2Url(url: string | null): string | null {
    if (!url) return url;
    const normalized = url.replace(/(^|\/)source\//, "$1media-storage/");

    const key = extractR2KeyFromUrl(normalized);
    if (key) {
        try {
            return getPublicR2Url(key);
        } catch {
            // Fall through
        }
    }

    if (!/^https?:\/\//i.test(normalized) && !normalized.startsWith("//")) {
        const trimmed = normalized.replace(/^\/+/, "");
        try {
            return getPublicR2Url(trimmed);
        } catch {
            return normalized;
        }
    }

    return normalized;
}

export function toPublicPlaybackUrl(url: string | null): string | null {
    const normalized = normalizeR2Url(url);
    if (!normalized) return normalized;
    return normalized.split("?")[0].split("#")[0];
}

export function extractR2Key(url: string): string | null {
    if (!url) return null;
    const withoutQuery = url.split("?")[0]?.split("#")[0] ?? "";
    const cleaned = withoutQuery.trim();
    if (!cleaned) return null;

    if (!/^https?:\/\//i.test(cleaned) && !cleaned.startsWith("//")) {
        return cleaned.replace(/^\/+/, "");
    }

    let parsed: URL;
    try {
        parsed = new URL(cleaned.startsWith("//") ? `https:${cleaned}` : cleaned);
    } catch {
        return null;
    }

    const path = parsed.pathname.replace(/^\/+/, "");
    if (!path) return null;

    const prefix = `${R2_KEY_PREFIX}/`;
    const prefixIndex = path.indexOf(prefix);
    if (prefixIndex >= 0) {
        return path.slice(prefixIndex);
    }

    try {
        const config = getR2Config();
        const bucketPrefix = `${config.bucketName}/`;
        if (path.startsWith(bucketPrefix)) {
            return path.slice(bucketPrefix.length);
        }
    } catch {
        // Ignore config errors
    }

    return path;
}
