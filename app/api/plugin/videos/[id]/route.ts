import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PLUGIN_VIDEO_SELECT, mapPluginVideo, resolvePluginOrigin, requirePluginUser } from "@/lib/plugin-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params

  try {
    const authResult = await requirePluginUser(request)
    if (authResult instanceof Response) {
      return authResult
    }

    const video = await prisma.video.findFirst({
      where: {
        id: params.id,
        status: "READY",
        visibility: "PUBLIC",
        OR: [{ mimeType: "video/mp4" }, { videoUrl: { endsWith: ".mp4" } }],
      },
      select: PLUGIN_VIDEO_SELECT,
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    return NextResponse.json(
      {
        data: mapPluginVideo(video, resolvePluginOrigin(request)),
        meta: {
          requested_at: new Date().toISOString(),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    )
  } catch (error) {
    console.error("Plugin video detail error:", error)
    return NextResponse.json({ error: "Failed to fetch plugin video" }, { status: 500 })
  }
}
