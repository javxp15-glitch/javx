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
    <div className="w-full min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Video Player Section */}
      <div className="w-full bg-black aspect-video relative">
        <video controls autoPlay className="w-full h-full" title={video.title}>
          <source src={video.videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Metadata Section */}
      <div className="p-4 md:p-6 space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold leading-tight">{video.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {video.categories.map((category) => (
              <span
                key={category.id}
                className="px-2 py-1 bg-white/10 text-xs md:text-sm rounded-md text-zinc-300 backdrop-blur-sm"
              >
                {category.name}
              </span>
            ))}
          </div>
        </div>

        {video.description && (
          <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg border border-white/5">
            <p className="text-sm md:text-base text-zinc-400 whitespace-pre-wrap leading-relaxed">
              {video.description}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
