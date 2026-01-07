"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { PlayCircle, Loader2, AlertCircle } from "lucide-react"

interface VideoPlayerProps {
  videoId: string
}

export function VideoPlayer({ videoId }: VideoPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchVideo() {
      try {
        const response = await fetch(`/api/videos/${videoId}`)
        if (response.ok) {
          const data = await response.json()
          setVideoUrl(data.video.videoUrl)
        } else {
          setError(true)
        }
      } catch (error) {
        console.error("Failed to fetch video:", error)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchVideo()
  }, [videoId])

  if (loading) {
    return (
      <div className="aspect-video w-full rounded-2xl bg-white/5 flex flex-col items-center justify-center animate-pulse border border-white/10">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground text-sm">Loading media...</p>
      </div>
    )
  }

  if (error || !videoUrl) {
    return (
      <div className="aspect-video w-full rounded-2xl bg-white/5 flex flex-col items-center justify-center border border-white/10">
        <AlertCircle className="w-10 h-10 text-destructive mb-4" />
        <p className="text-muted-foreground">Video unavailable</p>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl shadow-black/50 ring-1 ring-white/10 group">
      <video
        controls
        className="w-full h-full object-contain aspect-video"
        poster="/placeholder-poster.jpg" // You might want to pass thumbnail url here if available in future
        preload="metadata"
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
