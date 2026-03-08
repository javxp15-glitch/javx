import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  PLUGIN_VIDEO_SELECT,
  type PluginVideoRecord,
  buildPluginResponseMeta,
  buildPluginVideoOrderBy,
  buildPluginVideoWhere,
  mapPluginVideo,
  parsePluginPagination,
  resolvePluginOrigin,
  requirePluginUser,
} from "@/lib/plugin-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requirePluginUser(request)
    if (authResult instanceof Response) {
      return authResult
    }

    const params = parsePluginPagination(request)
    const where = buildPluginVideoWhere({
      since: params.since,
      search: params.search,
      categorySlug: params.categorySlug,
      pornstarSlug: params.pornstarSlug,
      tagSlug: params.tagSlug,
    })
    const orderBy = buildPluginVideoOrderBy(params.order)
    const skip = (params.page - 1) * params.perPage
    const origin = resolvePluginOrigin(request)

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy,
        skip,
        take: params.perPage,
        select: PLUGIN_VIDEO_SELECT,
      }),
      prisma.video.count({ where }),
    ])

    const totalPages = total > 0 ? Math.ceil(total / params.perPage) : 0
    const hasMore = params.page * params.perPage < total

    return NextResponse.json(
      {
        data: videos.map((video: PluginVideoRecord) => mapPluginVideo(video, origin)),
        pagination: {
          page: params.page,
          per_page: params.perPage,
          total,
          total_pages: totalPages,
          next_page: hasMore ? params.page + 1 : null,
          has_more: hasMore,
        },
        cursor: buildPluginResponseMeta(videos),
        meta: {
          requested_at: new Date().toISOString(),
          order: params.order,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    )
  } catch (error) {
    console.error("Plugin video list error:", error)
    return NextResponse.json({ error: "Failed to fetch plugin videos" }, { status: 500 })
  }
}
