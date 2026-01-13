import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRequestingDomain, isDomainAllowedForVideo } from "@/lib/domain-security"

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const videoId = params.id

    // Step 1: Get basic video info first (faster query)
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        title: true,
        videoUrl: true,
        description: true,
        visibility: true,
        status: true,
        views: true,
      },
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Check if video is ready
    if (video.status !== "READY") {
      return NextResponse.json({ error: "Video is not ready" }, { status: 400 })
    }

    // Get requesting domain
    const requestingDomain = getRequestingDomain(request)

    console.log("[v0] Embed request - Video ID:", videoId)
    console.log("[v0] Embed request - Video visibility:", video.visibility)
    console.log("[v0] Embed request - Video visibility:", video.visibility)
    console.log("[v0] Embed request - Requesting domain:", requestingDomain)

    // Increment view count for all valid requests (Public & Domain Restricted)
    // We do this asynchronously to not block the response
    prisma.video.update({
      where: { id: videoId },
      data: { views: { increment: 1 } },
    }).catch(err => console.error("Failed to increment view count:", err))

    // For PUBLIC videos, allow access from anywhere

    // For PUBLIC videos, allow access from anywhere
    if (video.visibility === "PUBLIC") {
      const response = NextResponse.json({
        video: {
          id: video.id,
          title: video.title,
          videoUrl: video.videoUrl,
          description: video.description,
          visibility: video.visibility,
          status: video.status,
        },
      })

      // Cache public videos for 5 minutes
      response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600')

      return response
    }

    // For PRIVATE videos, deny embed access
    if (video.visibility === "PRIVATE") {
      return NextResponse.json({ error: "This video is private and cannot be embedded" }, { status: 403 })
    }

    // For DOMAIN_RESTRICTED videos, check domain
    if (video.visibility === "DOMAIN_RESTRICTED") {
      if (!requestingDomain) {
        return NextResponse.json(
          { error: "Unable to verify domain. Please embed this video in a webpage." },
          { status: 403 },
        )
      }

      const isAllowed = await isDomainAllowedForVideo(videoId, requestingDomain)

      console.log("[v0] Domain check result:", isAllowed)

      if (!isAllowed) {
        return NextResponse.json({ error: `This video cannot be embedded on this domain. (Detected: ${requestingDomain || 'None'})` }, { status: 403 })
      }

      // Domain is allowed
      const response = NextResponse.json({
        video: {
          id: video.id,
          title: video.title,
          videoUrl: video.videoUrl,
          description: video.description,
          visibility: video.visibility,
          status: video.status,
        },
      })

      // Cache domain-restricted videos for 2 minutes (shorter to allow domain changes)
      response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=240')

      return response
    }

    return NextResponse.json({ error: "Invalid video configuration" }, { status: 400 })
  } catch (error) {
    console.error("Embed error:", error)
    return NextResponse.json({ error: "Failed to load video" }, { status: 500 })
  }
}
