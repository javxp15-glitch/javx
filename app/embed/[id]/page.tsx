import { headers } from "next/headers"
import { VideoEmbed } from "@/components/video-embed"
import { prisma } from "@/lib/prisma"
import { extractDomain } from "@/lib/domain-security"

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: "Video Embed",
  robots: "noindex",
}

export default async function EmbedPage({ params }: PageProps) {
  const { id } = await params

  // 1. Get request headers for domain check
  const headersList = await headers()
  const referer = headersList.get("referer")

  // 2. Fetch Video Data
  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      allowedDomains: {
        include: { domain: true },
      },
      categories: {
        include: { category: true },
      }
    },
  })

  // Case: Video not found
  if (!video) {
    return <VideoEmbed videoId={id} initialError="Video not found" initialVideo={null} />
  }

  // Case: Not Ready
  if (video.status !== "READY") {
    return <VideoEmbed videoId={id} initialError="Video is not ready" initialVideo={null} />
  }

  // 3. Domain Security Check (Server-Side)
  let isAllowed = false
  let errorMsg: string | null = null

  if (video.visibility === "PUBLIC") {
    isAllowed = true
  } else if (video.visibility === "PRIVATE") {
    isAllowed = false
    errorMsg = "This video is private and cannot be embedded"
  } else if (video.visibility === "DOMAIN_RESTRICTED") {
    if (!referer) {
      isAllowed = false
      errorMsg = "Unable to verify domain. Please embed this video in a webpage."
    } else {
      const requestingDomain = extractDomain(referer)
      const allowedDomains = video.allowedDomains.map((ad) => ad.domain.domain)

      // Check logic
      const match = allowedDomains.some((allowedDomain) => {
        const normalizedRequesting = requestingDomain?.replace(/^www\./, "") || ""
        const normalizedAllowed = allowedDomain.replace(/^www\./, "")
        return normalizedRequesting === normalizedAllowed
      })

      if (match) {
        isAllowed = true
      } else {
        isAllowed = false
        // Debug info included for user
        errorMsg = `This video cannot be embedded on this domain. (Detected: ${requestingDomain || 'None'})`
      }
    }
  }

  if (!isAllowed) {
    return <VideoEmbed videoId={id} initialError={errorMsg || "Access denied"} initialVideo={null} />
  }

  // 4. Increment View Count (Fire and forget, non-blocking)
  // Note: manipulating DB inside render is generally okay for View Count if carefully managed,
  // but to be safe and avoid "Writes during render" warnings in Strict Mode, purely read here OR use a Server Action.
  // Actually, for a simple GET page visit, doing it here is a common pattern in Next.js App Router for simple analytics.
  // We'll trust Next.js to handle the cache invalidation or just ignore the promise result.
  prisma.video.update({
    where: { id },
    data: { views: { increment: 1 } },
  }).catch(console.error)

  // 5. Construct Video Data for Client
  const videoData = {
    id: video.id,
    title: video.title,
    videoUrl: video.videoUrl,
    description: video.description,
    categories: video.categories.map(c => c.category),
    visibility: video.visibility,
    status: video.status,
  }

  return <VideoEmbed videoId={id} initialVideo={videoData} initialError={null} />
}
