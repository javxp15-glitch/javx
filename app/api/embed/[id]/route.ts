import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRequestingDomain, isDomainAllowedForVideo } from "@/lib/domain-security"
import { resolvePluginOrigin } from "@/lib/plugin-api"

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const videoId = params.id

    // Get video from database
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        allowedDomains: {
          include: {
            domain: true,
          },
        },
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
    console.log("[v0] Embed request - Requesting domain:", requestingDomain)

    // Resolve app origin for proxy URLs
    const appUrl = resolvePluginOrigin(request)

    // For PUBLIC videos, allow access from anywhere
    if (video.visibility === "PUBLIC") {
      const proxyUrl = `${appUrl}/api/proxy/video/${video.id}.mp4`

      return NextResponse.json({
        video: {
          id: video.id,
          title: video.title,
          videoUrl: proxyUrl, // Force Proxy URL
          visibility: video.visibility,
          status: video.status,
        },
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      })
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
        return NextResponse.json({ error: "This video cannot be embedded on this domain" }, { status: 403 })
      }

      // Domain is allowed - use proxy URL to hide direct storage URL
      const proxyUrl = `${appUrl}/api/proxy/video/${video.id}.mp4`
      return NextResponse.json({
        video: {
          id: video.id,
          title: video.title,
          videoUrl: proxyUrl,
          visibility: video.visibility,
          status: video.status,
        },
      }, {
        headers: {
          'Cache-Control': 'private, max-age=60'
        }
      })
    }

    return NextResponse.json({ error: "Invalid video configuration" }, { status: 400 })
  } catch (error) {
    console.error("Embed error:", error)
    return NextResponse.json({ error: "Failed to load video" }, { status: 500 })
  }
}
