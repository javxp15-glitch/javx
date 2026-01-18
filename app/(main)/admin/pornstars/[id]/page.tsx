"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
    ArrowLeft,
    Pencil,
    Trash2,
    User,
    Play,
    Eye,
    Calendar,
    Loader2,
} from "lucide-react"
import Link from "next/link"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { PornstarForm } from "@/components/pornstar-form"
import { formatDuration, formatNumber } from "@/lib/utils"

interface Pornstar {
    id: string
    name: string
    nameJp: string | null
    slug: string
    avatar: string | null
    height: number | null
    cupSize: string | null
    bust: number | null
    waist: number | null
    hip: number | null
    birthday: string | null
    age: number | null
    debutYear: number | null
    nationality: string | null
    bio: string | null
    videoCount: number
    videos: Video[]
    createdAt: string
}

interface Video {
    id: string
    title: string
    slug: string
    thumbnailUrl: string | null
    duration: number | null
    views: number
    status: string
    createdAt: string
}

export default function PornstarDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params)
    const router = useRouter()
    const [pornstar, setPornstar] = useState<Pornstar | null>(null)
    const [loading, setLoading] = useState(true)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [formOpen, setFormOpen] = useState(false)

    const fetchPornstar = async () => {
        try {
            const response = await fetch(`/api/pornstars/${params.id}`)
            if (response.ok) {
                const data = await response.json()
                setPornstar(data.pornstar)
            } else {
                router.push("/admin/pornstars")
            }
        } catch (error) {
            console.error("Failed to fetch pornstar:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPornstar()
    }, [params.id])

    const handleDelete = async () => {
        try {
            await fetch(`/api/pornstars/${params.id}`, { method: "DELETE" })
            router.push("/admin/pornstars")
        } catch (error) {
            console.error("Failed to delete pornstar:", error)
        }
    }

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!pornstar) {
        return null
    }

    const measurements = [
        pornstar.bust && `B${pornstar.bust}`,
        pornstar.waist && `W${pornstar.waist}`,
        pornstar.hip && `H${pornstar.hip}`,
    ].filter(Boolean).join(" / ")

    const stats = `${pornstar.height || "?"}cm / ${pornstar.cupSize || "?"}${measurements ? ` - ${measurements}` : ""}`

    return (
        <div className="min-h-[calc(100vh-6rem)] bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    className="mb-6"
                    onClick={() => router.push("/admin/pornstars")}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Pornstars
                </Button>

                {/* Profile Header */}
                <div className="flex flex-col md:flex-row items-start gap-8 mb-10">
                    {/* Avatar */}
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                        {pornstar.avatar ? (
                            <img
                                src={pornstar.avatar}
                                alt={pornstar.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <User className="h-16 w-16 text-muted-foreground" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-white">{pornstar.name}</h1>
                                {pornstar.nameJp && (
                                    <p className="text-lg text-muted-foreground">{pornstar.nameJp}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setDeleteDialogOpen(true)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </Button>
                            </div>
                        </div>

                        <p className="text-primary">{stats}</p>

                        {(pornstar.birthday || pornstar.age) && (
                            <p className="text-muted-foreground">
                                {pornstar.birthday && new Date(pornstar.birthday).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                                {pornstar.age && ` (age ${pornstar.age})`}
                            </p>
                        )}

                        <div className="flex items-center gap-4">
                            <Badge variant="secondary" className="bg-primary/20 text-primary">
                                {formatNumber(pornstar.videoCount)} videos
                            </Badge>
                            {pornstar.debutYear && (
                                <Badge variant="outline" className="border-white/20">
                                    Debut: {pornstar.debutYear}
                                </Badge>
                            )}
                            {pornstar.nationality && (
                                <Badge variant="outline" className="border-white/20">
                                    {pornstar.nationality}
                                </Badge>
                            )}
                        </div>

                        {pornstar.bio && (
                            <p className="text-muted-foreground max-w-2xl">{pornstar.bio}</p>
                        )}
                    </div>
                </div>

                {/* Videos Section */}
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Videos ({pornstar.videos.length})</h2>

                    {pornstar.videos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-white/10 rounded-lg">
                            <Play className="h-8 w-8 mb-2" />
                            <p>No videos associated with this pornstar.</p>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {pornstar.videos.map((video) => (
                                <Link
                                    key={video.id}
                                    href={`/videos/${video.id}`}
                                    className="group block space-y-3"
                                >
                                    <div className="relative aspect-video rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/10 group-hover:ring-primary/50 transition-all">
                                        {video.thumbnailUrl ? (
                                            <img
                                                src={video.thumbnailUrl}
                                                alt={video.title}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Play className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                        )}
                                        {video.duration && (
                                            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-xs text-white">
                                                {formatDuration(video.duration)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium text-white group-hover:text-primary transition-colors line-clamp-2">
                                            {video.title}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Eye className="h-3 w-3" />
                                                {formatNumber(video.views)}
                                            </span>
                                            <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Form Dialog */}
            <PornstarForm
                open={formOpen}
                onOpenChange={setFormOpen}
                initialData={{
                    id: pornstar.id,
                    name: pornstar.name,
                    nameJp: pornstar.nameJp || "",
                    slug: pornstar.slug,
                    avatar: pornstar.avatar || "",
                    height: pornstar.height?.toString() || "",
                    cupSize: pornstar.cupSize || "",
                    bust: pornstar.bust?.toString() || "",
                    waist: pornstar.waist?.toString() || "",
                    hip: pornstar.hip?.toString() || "",
                    birthday: pornstar.birthday ? new Date(pornstar.birthday).toISOString().split("T")[0] : "",
                    debutYear: pornstar.debutYear?.toString() || "",
                    nationality: pornstar.nationality || "",
                    bio: pornstar.bio || "",
                }}
                onSuccess={fetchPornstar}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Pornstar</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {pornstar.name}?
                            This will also remove all associations with videos.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
