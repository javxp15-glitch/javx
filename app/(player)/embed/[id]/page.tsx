import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { extractDomain } from "@/lib/domain-security"
import { normalizeR2Url } from "@/lib/r2"
import VideoPlayer from "@/components/video-player"

// Cache this page for 60 seconds
export const revalidate = 60

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
    },
  })

  // Error Helper
  const ErrorScreen = ({ message, icon = "!" }: { message: string, icon?: string }) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#000',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
      <p style={{ fontSize: '16px', color: '#ccc' }}>{message}</p>
    </div>
  )

  // Case: Video not found
  if (!video) {
    return <ErrorScreen message="Video not found" />
  }

  // Case: Not Ready
  if (video.status !== "READY") {
    return <ErrorScreen message="Video is not ready" />
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

      const match = allowedDomains.some((allowedDomain) => {
        const normalizedRequesting = requestingDomain?.replace(/^www\./, "") || ""
        const normalizedAllowed = allowedDomain.replace(/^www\./, "")
        return normalizedRequesting === normalizedAllowed
      })

      if (match) {
        isAllowed = true
      } else {
        isAllowed = false
        errorMsg = `This video cannot be embedded on this domain.`
      }
    }
  }

  if (!isAllowed) {
    return <ErrorScreen message={errorMsg || "Access denied"} icon="🔒" />
  }

  // 4. Increment View Count (Fire and forget, non-blocking)
  prisma.video.update({
    where: { id },
    data: { views: { increment: 1 } },
  }).catch(console.error)

  // 5. Render Raw HTML Video Player
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <VideoPlayer
        src={normalizeR2Url(video.videoUrl) || video.videoUrl}
        className="w-full h-full"
        poster={video.thumbnailUrl || undefined}
      />
    </div>
  )
}
