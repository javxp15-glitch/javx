"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Eye, Clock, PlayCircle } from "lucide-react"
import { useSearchParams } from "next/navigation"

interface Video {
  id: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  views: number
  createdAt: string
  category: { name: string } | null
  visibility: string
}

export function VideoGrid() {
  const searchParams = useSearchParams()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })

  useEffect(() => {
    async function fetchVideos() {
      setLoading(true)
      try {
        const params = new URLSearchParams(searchParams.toString())
        const response = await fetch(`/api/videos/feed?${params}`)
        if (response.ok) {
          const data = await response.json()
          setVideos(data.videos)
          setPagination(data.pagination)
        }
      } catch (error) {
        console.error("Failed to fetch videos:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchVideos()
  }, [searchParams])

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-video rounded-xl bg-white/5 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <PlayCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-white">No videos found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
        {videos.map((video) => (
          <Link key={video.id} href={`/videos/${video.id}`} className="group block space-y-3">
            {/* Thumbnail Wrapper */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5 ring-1 ring-white/10 group-hover:ring-primary/50 transition-all duration-300">
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl || "/public/none.png"}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
                  <PlayCircle className="h-12 w-12 text-white/20 group-hover:text-primary transition-colors" />
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white scale-75 group-hover:scale-100 transition-transform">
                  <PlayCircle className="w-6 h-6 fill-current" />
                </div>
              </div>

              {/* Badges */}
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="backdrop-blur-md bg-black/50 text-white border-0 text-[10px] px-2 h-5">
                  {video.visibility}
                </Badge>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-1">
              <h3 className="font-medium text-base text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                {video.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {video.views}
                </span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span>{video.category?.name || "Uncategorized"}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-8">
          {[...Array(pagination.totalPages)].map((_, i) => (
            <Button
              key={i}
              variant={pagination.page === i + 1 ? "default" : "outline"}
              size="sm"
              asChild
              className={pagination.page === i + 1 ? "bg-primary text-primary-foreground" : "bg-transparent border-white/10 text-muted-foreground hover:bg-white/5 hover:text-white"}
            >
              <Link href={`?page=${i + 1}`}>{i + 1}</Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
