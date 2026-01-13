"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Lock } from "lucide-react"

interface VideoEmbedProps {
  videoId: string
}

interface Category {
  id: string
  name: string
  slug: string
}

export interface VideoData {
  id: string
  title: string
  videoUrl: string
  description: string | null
  categories: Category[]
  visibility: string
  status: string
}

interface VideoEmbedProps {
  videoId: string
  initialVideo?: VideoData | null
  initialError?: string | null
}

export function VideoEmbed({ videoId, initialVideo, initialError }: VideoEmbedProps) {
  const [video, setVideo] = useState<VideoData | null>(initialVideo || null)
  const [loading, setLoading] = useState(!initialVideo && !initialError)
  const [error, setError] = useState<string | null>(initialError || null)

  useEffect(() => {
    if (initialVideo || initialError) return

    async function fetchVideo() {
      try {
        const response = await fetch(`/api/embed/${videoId}`)

        if (!response.ok) {
          const data = await response.json()
          setError(data.error || "Failed to load video")
          return
        }

        const data = await response.json()
        setVideo(data.video)
      } catch (err) {
        setError("Failed to load video")
      } finally {
        setLoading(false)
      }
    }
    fetchVideo()
  }, [videoId])

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading video...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center space-y-4">
          {error.includes("domain") ? (
            <Lock className="h-12 w-12 mx-auto text-red-500" />
          ) : (
            <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
          )}
          <p className="text-lg">{error}</p>
        </div>
      </div>
    )
  }

  if (!video || video.status !== "READY") {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <p>Video is not available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-black text-white relative overflow-hidden group">
      {/* Video Player Section - Full Screen */}
      <div className="absolute inset-0">
        <video
          controls
          playsInline
          preload="metadata"
          className="w-full h-full"
          title={video.title}
          style={{ objectFit: 'contain' }}
          webkit-playsinline="true"
        >
          <source src={video.videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

    </div>
  )
}
