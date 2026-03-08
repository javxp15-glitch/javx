"use client"

import { useState, useEffect } from "react"
import { VideoPlayer } from "@/components/video-player"
import { VideoInfo } from "@/components/video-info"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Play, X, ChevronUp, ChevronDown } from "lucide-react"
import { use } from "react"

interface PageProps {
  params: Promise<{ id: string }>
}

interface VideoData {
  id: string
  title: string
  thumbnailUrl: string | null
}

interface VideoNavItem {
  id: string
  title: string
  thumbnailUrl: string | null
  duration: number | null
}

export default function VideoDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const [showPlayer, setShowPlayer] = useState(false)
  const [video, setVideo] = useState<VideoData | null>(null)
  const [prevVideo, setPrevVideo] = useState<VideoNavItem | null>(null)
  const [nextVideo, setNextVideo] = useState<VideoNavItem | null>(null)
  const [relatedVideos, setRelatedVideos] = useState<VideoNavItem[]>([])

  useEffect(() => {
    let isCancelled = false

    const loadVideoData = async () => {
      try {
        const currentVideoResponse = await fetch(`/api/videos/${id}`)
        const currentVideoData = await currentVideoResponse.json()

        if (!isCancelled) {
          setVideo(currentVideoResponse.ok ? (currentVideoData.video ?? null) : null)
        }
      } catch (error) {
        console.error("Failed to load current video", error)
        if (!isCancelled) setVideo(null)
      }

      try {
        const feedResponse = await fetch(`/api/videos/feed?limit=100&sort=newest`)
        const feedData = await feedResponse.json()
        const videos = Array.isArray(feedData?.videos) ? (feedData.videos as VideoNavItem[]) : []
        const currentIndex = videos.findIndex(v => v.id === id)

        if (isCancelled) return

        setPrevVideo(currentIndex > 0 ? videos[currentIndex - 1] : null)
        setNextVideo(currentIndex >= 0 && currentIndex < videos.length - 1 ? videos[currentIndex + 1] : null)
        setRelatedVideos(videos.filter(v => v.id !== id).slice(0, 6))

        if (!feedResponse.ok) {
          console.error("Failed to load video feed", feedData)
        }
      } catch (error) {
        console.error("Failed to load video feed", error)
        if (!isCancelled) {
          setPrevVideo(null)
          setNextVideo(null)
          setRelatedVideos([])
        }
      }
    }

    loadVideoData()

    return () => {
      isCancelled = true
    }
  }, [id])

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return ""
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        {/* Back Button */}
        <Button
          variant="ghost"
          asChild
          className="mb-6 text-muted-foreground hover:text-white pl-0 hover:bg-transparent"
        >
          <Link href="/videos" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>

        {/* Three Column Layout */}
        <div className="grid lg:grid-cols-[200px_1fr_350px] gap-6">
          {/* Left Sidebar - Video Navigation */}
          <div className="hidden lg:block space-y-4">
            {/* Related Videos List */}
            {relatedVideos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide px-2">More Videos</p>
                <div className="space-y-1">
                  {relatedVideos.map((v) => (
                    <Link
                      key={v.id}
                      href={`/videos/${v.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                      <div className="relative w-12 aspect-video rounded overflow-hidden bg-white/10 flex-shrink-0">
                        {v.thumbnailUrl ? (
                          <img
                            src={v.thumbnailUrl}
                            alt={v.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        {v.duration && (
                          <span className="absolute bottom-0.5 right-0.5 px-1 text-[8px] bg-black/70 text-white rounded">
                            {formatDuration(v.duration)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground group-hover:text-white transition-colors line-clamp-2 flex-1">
                        {v.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center - Video/Thumbnail */}
          <div className="space-y-4">
            {showPlayer ? (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPlayer(false)}
                    className="text-muted-foreground hover:text-white"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Hide
                  </Button>
                </div>
                <VideoPlayer videoId={id} />
              </div>
            ) : (
              // Thumbnail with Play Button Overlay
              <div
                onClick={() => setShowPlayer(true)}
                className="relative aspect-video rounded-xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer group"
              >
                {video?.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title || "Video thumbnail"}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 text-white fill-white ml-1" />
                  </div>
                </div>

                {/* Click to play text */}
                <div className="absolute bottom-4 left-4 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to play
                </div>
              </div>
            )}

            {/* Mobile Navigation */}
            <div className="flex gap-2 lg:hidden">
              {prevVideo && (
                <Button variant="outline" size="sm" asChild className="flex-1 bg-white/5 border-white/10">
                  <Link href={`/videos/${prevVideo.id}`}>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Prev
                  </Link>
                </Button>
              )}
              {nextVideo && (
                <Button variant="outline" size="sm" asChild className="flex-1 bg-white/5 border-white/10">
                  <Link href={`/videos/${nextVideo.id}`}>
                    Next
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Right Side - Video Details */}
          <div>
            <VideoInfo videoId={id} />
          </div>
        </div>
      </div>
    </div>
  )
}
