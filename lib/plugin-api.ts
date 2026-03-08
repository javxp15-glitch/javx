import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getUserFromRequest, type JWTPayload } from "@/lib/auth"
import { normalizeR2Url } from "@/lib/r2"
import { resolveAppOriginFromHeaders } from "@/lib/app-origin"

export const PLUGIN_VIDEO_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  videoUrl: true,
  thumbnailUrl: true,
  duration: true,
  mimeType: true,
  status: true,
  visibility: true,
  createdAt: true,
  updatedAt: true,
  views: true,
  categories: {
    select: {
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  },
  pornstars: {
    select: {
      pornstar: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  },
  tags: {
    select: {
      tag: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  },
  createdBy: {
    select: {
      name: true,
      email: true,
    },
  },
}

export type PluginVideoRecord = {
  id: string
  title: string
  slug: string
  description: string | null
  videoUrl: string
  thumbnailUrl: string | null
  duration: number | null
  mimeType: string | null
  status: string
  visibility: string
  createdAt: Date
  updatedAt: Date
  views: number
  categories: Array<{ category: { name: string; slug: string } }>
  pornstars: Array<{ pornstar: { name: string; slug: string } }>
  tags: Array<{ tag: { name: string; slug: string } }>
  createdBy: {
    name: string | null
    email: string | null
  }
}

export function parsePluginPagination(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = clampInteger(searchParams.get("page"), 1, 1)
  const perPage = clampInteger(searchParams.get("per_page"), 20, 1, 50)
  const since = parseSinceDate(searchParams.get("since"))
  const order = parseOrder(searchParams.get("order"))
  const search = searchParams.get("search")?.trim() || ""

  return {
    page,
    perPage,
    since,
    order,
    search,
    categorySlug: searchParams.get("categorySlug")?.trim() || "",
    pornstarSlug: searchParams.get("pornstarSlug")?.trim() || "",
    tagSlug: searchParams.get("tagSlug")?.trim() || "",
  }
}

export async function requirePluginUser(request: NextRequest): Promise<JWTPayload | NextResponse> {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!["ADMIN", "EDITOR"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return user
}

export function buildPluginVideoWhere(params: {
  since: Date | null
  search: string
  categorySlug: string
  pornstarSlug: string
  tagSlug: string
}) {
  const where: Record<string, unknown> = {
    status: "READY",
    visibility: "PUBLIC",
    AND: [
      {
        OR: [{ mimeType: "video/mp4" }, { videoUrl: { endsWith: ".mp4" } }],
      },
    ],
  }

  if (params.since) {
    where.updatedAt = {
      gt: params.since,
    }
  }

  if (params.search) {
    where.OR = [
      {
        title: {
          contains: params.search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: params.search,
          mode: "insensitive",
        },
      },
    ]
  }

  if (params.categorySlug) {
    where.categories = {
      some: {
        category: {
          slug: params.categorySlug,
        },
      },
    }
  }

  if (params.pornstarSlug) {
    where.pornstars = {
      some: {
        pornstar: {
          slug: params.pornstarSlug,
        },
      },
    }
  }

  if (params.tagSlug) {
    where.tags = {
      some: {
        tag: {
          slug: params.tagSlug,
        },
      },
    }
  }

  return where
}

export function buildPluginVideoOrderBy(order: "updated_asc" | "updated_desc") {
  if (order === "updated_desc") {
    return [{ updatedAt: "desc" }, { id: "desc" }]
  }

  return [{ updatedAt: "asc" }, { id: "asc" }]
}

export function mapPluginVideo(video: PluginVideoRecord, origin: string) {
  const playbackUrl = new URL(`/api/proxy/video/${video.id}.mp4`, origin).toString()

  return {
    id: video.id,
    title: video.title,
    slug: video.slug,
    description: video.description ?? "",
    video_url: normalizeR2Url(video.videoUrl),
    playback_url: playbackUrl,
    embed_url: new URL(`/embed/${video.id}`, origin).toString(),
    source_url: new URL(`/videos/${video.id}`, origin).toString(),
    thumbnail_url: normalizeR2Url(video.thumbnailUrl),
    duration: video.duration,
    categories: video.categories.map((item: { category: { name: string } }) => item.category.name),
    pornstars: video.pornstars.map((item: { pornstar: { name: string; slug: string } }) => ({
      name: item.pornstar.name,
      slug: item.pornstar.slug,
    })),
    tags: video.tags.map((item: { tag: { name: string } }) => item.tag.name),
    created_at: video.createdAt,
    updated_at: video.updatedAt,
    status: video.status,
    visibility: video.visibility,
    views: video.views,
    uploader: video.createdBy.name ?? video.createdBy.email ?? "System",
    rating: "99%",
  }
}

export function resolvePluginOrigin(request: NextRequest): string {
  return resolveAppOriginFromHeaders(
    request.headers,
    new URL(request.url).origin,
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.SITE_URL || ""
  )
}

export function buildPluginResponseMeta(videos: PluginVideoRecord[]) {
  const maxUpdatedAt = videos.reduce<string | null>((latest, video) => {
    const current = video.updatedAt.toISOString()
    if (!latest || current > latest) {
      return current
    }
    return latest
  }, null)

  return {
    max_updated_at: maxUpdatedAt,
    next_since: maxUpdatedAt,
  }
}

function clampInteger(value: string | null, fallback: number, min: number, max = Number.MAX_SAFE_INTEGER) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.trunc(numeric)))
}

function parseOrder(value: string | null): "updated_asc" | "updated_desc" {
  if (value === "updated_desc") {
    return value
  }

  return "updated_asc"
}

function parseSinceDate(value: string | null): Date | null {
  if (!value) {
    return null
  }

  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    const ms = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric
    const numericDate = new Date(ms)
    if (!Number.isNaN(numericDate.getTime())) {
      return numericDate
    }
  }

  const isoDate = new Date(value)
  if (Number.isNaN(isoDate.getTime())) {
    return null
  }

  return isoDate
}
