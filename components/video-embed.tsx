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
    <div className="w-full h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      {/* Video Player Section - Takes remaining space */}
      <div className="flex-1 bg-black relative min-h-0">
        <video
          controls
          autoPlay
          className="w-full h-full"
          title={video.title}
          style={{ objectFit: 'contain' }}
        >
          <source src={video.videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Metadata Section - Auto height */}
      <div className="flex-shrink-0 p-3 md:p-4 space-y-2 bg-zinc-950/90 backdrop-blur border-t border-white/10 max-h-[40vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-lg md:text-xl font-bold leading-tight line-clamp-2">{video.title}</h1>
          <div className="flex flex-wrap gap-2 justify-end shrink-0">
            {video.categories.slice(0, 3).map((category) => (
              <span
                key={category.id}
                className="px-1.5 py-0.5 bg-white/10 text-[10px] md:text-xs rounded text-zinc-300 whitespace-nowrap"
              >
                {category.name}
              </span>
            ))}
            {video.categories.length > 3 && (
              <span className="px-1.5 py-0.5 bg-white/5 text-[10px] md:text-xs rounded text-zinc-500">
                +{video.categories.length - 3}
              </span>
            )}
          </div>
        </div>

        {video.description && (
          <p className="text-xs md:text-sm text-zinc-400 line-clamp-2 hover:line-clamp-none cursor-pointer transition-all">
            {video.description}
          </p>
        )}
      </div>
    </div>
  )
}
