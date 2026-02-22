import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { enqueueVideoTranscode } from "@/lib/video-transcode"

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const videos = await prisma.video.findMany({
      where: {
        OR: [
          { videoUrl: { endsWith: ".mov" } },
          { mimeType: "video/quicktime" },
        ],
      },
      select: { id: true, videoUrl: true, mimeType: true },
    })

    for (const video of videos) {
      enqueueVideoTranscode(video.id, video.videoUrl, video.mimeType)
    }

    return NextResponse.json({
      message: `Queued ${videos.length} video(s) for transcoding`,
      count: videos.length,
    })
  } catch (error) {
    console.error("Retranscode MOV error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
