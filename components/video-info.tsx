"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Eye,
  Clock,
  HardDrive,
  Edit,
  Trash2,
  Copy,
  User,
  Tag,
  Folder,
  Globe,
  Lock,
  Loader2,
  Check,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { toast } from "sonner"
import { formatDuration, formatFileSize, formatNumber } from "@/lib/utils"

interface CategoryRelation {
  category: { id: string; name: string; slug: string }
}

interface PornstarRelation {
  pornstar: { id: string; name: string; nameJp: string | null; slug: string; avatar: string | null }
}

interface TagRelation {
  tag: { id: string; name: string; slug: string }
}

interface DomainRelation {
  domain: { id: string; domain: string }
}

interface Video {
  id: string
  title: string
  slug: string
  description: string | null
  duration: number | null
  fileSize: number | null
  mimeType: string | null
  views: number
  visibility: string
  status: string
  createdAt: string
  categories: CategoryRelation[]
  pornstars: PornstarRelation[]
  tags: TagRelation[]
  allowedDomains: DomainRelation[]
  createdBy: { name: string | null; email: string }
}

interface VideoInfoProps {
  videoId: string
}

export function VideoInfo({ videoId }: VideoInfoProps) {
  const router = useRouter()
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetchVideo() {
      try {
        const response = await fetch(`/api/videos/${videoId}`)
        if (response.ok) {
          const data = await response.json()
          setVideo(data.video)
        }
      } catch (error) {
        console.error("Failed to fetch video:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchVideo()
  }, [videoId])

  const handleDelete = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete video")
      }

      toast.success("Video deleted")
      router.push("/videos")
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete video"
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  const copyEmbedCode = () => {
    const embedCode = `<iframe src="${window.location.origin}/embed/${videoId}" width="100%" height="480" frameborder="0" allowfullscreen></iframe>`
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    toast.success("Embed code copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!video) {
    return <div className="text-muted-foreground p-4 text-center">Video not found</div>
  }

  const visibilityConfig = {
    PUBLIC: { icon: Globe, label: "Public", color: "text-blue-400" },
    PRIVATE: { icon: Lock, label: "Private", color: "text-gray-400" },
    DOMAIN_RESTRICTED: { icon: Globe, label: "Domain Only", color: "text-purple-400" },
  }

  const VisibilityIcon = visibilityConfig[video.visibility as keyof typeof visibilityConfig]?.icon || Globe
  const visibilityLabel = visibilityConfig[video.visibility as keyof typeof visibilityConfig]?.label || video.visibility
  const visibilityColor = visibilityConfig[video.visibility as keyof typeof visibilityConfig]?.color || "text-gray-400"

  return (
    <div className="space-y-6">
      {/* Title */}
      <h1 className="text-xl font-bold text-white leading-tight">{video.title}</h1>

      {/* Quick Stats */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Eye className="h-4 w-4" />
          <span>{formatNumber(video.views)} views</span>
        </div>
        {video.duration && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(video.duration)}</span>
          </div>
        )}
        {video.fileSize && (
          <div className="flex items-center gap-1.5">
            <HardDrive className="h-4 w-4" />
            <span>{formatFileSize(video.fileSize)}</span>
          </div>
        )}
        <div className={`flex items-center gap-1.5 ${visibilityColor}`}>
          <VisibilityIcon className="h-4 w-4" />
          <span>{visibilityLabel}</span>
        </div>
      </div>

      {/* Pornstars */}
      {video.pornstars && video.pornstars.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
            <User className="h-3.5 w-3.5" />
            <span>Pornstars</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {video.pornstars.map((rel) => (
              <Link
                key={rel.pornstar.id}
                href={`/admin/pornstars/${rel.pornstar.id}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 transition-colors"
              >
                {rel.pornstar.avatar ? (
                  <img
                    src={rel.pornstar.avatar}
                    alt={rel.pornstar.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-pink-500/30 flex items-center justify-center">
                    <User className="h-3 w-3 text-pink-400" />
                  </div>
                )}
                <span className="text-sm text-pink-400">{rel.pornstar.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {video.categories && video.categories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
            <Folder className="h-3.5 w-3.5" />
            <span>Categories</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {video.categories.map((rel) => (
              <Badge
                key={rel.category.id}
                variant="outline"
                className="border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
              >
                {rel.category.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {video.tags && video.tags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
            <Tag className="h-3.5 w-3.5" />
            <span>Tags</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {video.tags.map((rel) => (
              <Badge
                key={rel.tag.id}
                variant="secondary"
                className="bg-white/5 text-muted-foreground hover:bg-white/10 border-0"
              >
                #{rel.tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {video.description && (
        <div className="space-y-2">
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {video.description}
          </p>
        </div>
      )}

      {/* Upload Info */}
      <div className="text-xs text-muted-foreground">
        Uploaded by <span className="text-white">{video.createdBy.name || video.createdBy.email}</span>
        {" "}{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={copyEmbedCode}
          className="bg-white/5 border-white/10 hover:bg-white/10"
        >
          {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
          {copied ? "Copied" : "Embed"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          asChild
          className="bg-white/5 border-white/10 hover:bg-white/10"
        >
          <Link href={`/videos/${videoId}/edit`}>
            <Edit className="h-4 w-4 mr-1.5" />
            Edit
          </Link>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300"
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-zinc-950 border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Video?</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                This action cannot be undone. The video and all associated files will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent text-white border-white/10 hover:bg-white/5">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Allowed Domains (if restricted) */}
      {video.visibility === "DOMAIN_RESTRICTED" && video.allowedDomains && video.allowedDomains.length > 0 && (
        <div className="pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Globe className="h-3.5 w-3.5" />
            <span>Allowed Domains</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {video.allowedDomains.map((rel) => (
              <Badge
                key={rel.domain.id}
                variant="outline"
                className="border-purple-500/30 text-purple-400 bg-purple-500/5"
              >
                {rel.domain.domain}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
