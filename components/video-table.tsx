"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Play,
    MoreHorizontal,
    Pencil,
    Trash2,
    Copy,
    Eye,
    ArrowUpDown,
    Search,
    Filter,
    X,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Globe,
    Settings,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { formatDuration, formatNumber } from "@/lib/utils"

interface Category {
    category: { id: string; name: string }
}

interface Pornstar {
    pornstar: { id: string; name: string; slug: string }
}

interface Tag {
    tag: { id: string; name: string; slug: string }
}

interface Domain {
    id: string
    domain: string
    isActive: boolean
}

interface Video {
    id: string
    title: string
    slug: string
    description: string | null
    thumbnailUrl: string | null
    videoUrl: string
    duration: number | null
    views: number
    visibility: "PUBLIC" | "PRIVATE" | "DOMAIN_RESTRICTED"
    status: "PROCESSING" | "READY" | "FAILED"
    createdAt: string
    categories?: Category[]
    pornstars?: Pornstar[]
    tags?: Tag[]
}

interface VideoTableProps {
    onEdit?: (video: Video) => void
    onDelete?: (videoIds: string[]) => void
    onBulkUpdate?: (videoIds: string[], data: Partial<Video>) => void
}

export function VideoTable({ onEdit, onDelete, onBulkUpdate }: VideoTableProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [videos, setVideos] = useState<Video[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
    const [searchQuery, setSearchQuery] = useState("")
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "popular">("newest")
    const [filterVisibility, setFilterVisibility] = useState<string>("all")

    // Dialog states
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [videosToDelete, setVideosToDelete] = useState<string[]>([])
    const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false)
    const [bulkEditLoading, setBulkEditLoading] = useState(false)

    // Bulk edit form state
    const [bulkVisibility, setBulkVisibility] = useState<string>("")
    const [bulkDomainIds, setBulkDomainIds] = useState<string[]>([])
    const [domains, setDomains] = useState<Domain[]>([])

    const fetchVideos = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set("page", pagination.page.toString())
            params.set("limit", pagination.limit.toString())
            params.set("sort", sortBy)
            if (searchQuery) params.set("search", searchQuery)
            if (filterVisibility !== "all") params.set("visibility", filterVisibility)

            const response = await fetch(`/api/videos?${params}`)
            if (response.ok) {
                const data = await response.json()
                setVideos(data.videos)
                setPagination(prev => ({
                    ...prev,
                    total: data.pagination.total,
                    totalPages: data.pagination.totalPages
                }))
            }
        } catch (error) {
            console.error("Failed to fetch videos:", error)
        } finally {
            setLoading(false)
        }
    }

    const fetchDomains = async () => {
        try {
            const response = await fetch("/api/domains", { credentials: "include" })
            if (response.ok) {
                const data = await response.json()
                setDomains(data.domains || [])
            }
        } catch (error) {
            console.error("Failed to fetch domains:", error)
        }
    }

    useEffect(() => {
        fetchVideos()
    }, [pagination.page, sortBy, filterVisibility])

    useEffect(() => {
        fetchDomains()
    }, [])

    const activeDomains = useMemo(() => domains.filter(d => d.isActive), [domains])

    const handleSearch = () => {
        setPagination(prev => ({ ...prev, page: 1 }))
        fetchVideos()
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === videos.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(videos.map(v => v.id)))
        }
    }

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const handleDeleteClick = (ids: string[]) => {
        setVideosToDelete(ids)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        try {
            await Promise.all(
                videosToDelete.map(id =>
                    fetch(`/api/videos/${id}`, { method: "DELETE" })
                )
            )
            toast.success(`${videosToDelete.length} video(s) deleted`)
            setSelectedIds(new Set())
            setDeleteDialogOpen(false)
            setVideosToDelete([])
            fetchVideos()
        } catch (error) {
            console.error("Failed to delete videos:", error)
            toast.error("Failed to delete videos")
        }
    }

    // Bulk Edit Functions
    const openBulkEditDialog = () => {
        setBulkVisibility("")
        setBulkDomainIds([])
        setBulkEditDialogOpen(true)
    }

    const toggleBulkDomain = (domainId: string) => {
        setBulkDomainIds(current =>
            current.includes(domainId)
                ? current.filter(id => id !== domainId)
                : [...current, domainId]
        )
    }

    const handleBulkEdit = async () => {
        if (!bulkVisibility) {
            toast.error("กรุณาเลือกการเผยแพร่")
            return
        }

        if (bulkVisibility === "DOMAIN_RESTRICTED" && bulkDomainIds.length === 0) {
            toast.error("กรุณาเลือก Domain อย่างน้อย 1 รายการ")
            return
        }

        setBulkEditLoading(true)
        try {
            const updatePromises = Array.from(selectedIds).map(id =>
                fetch(`/api/videos/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        visibility: bulkVisibility,
                        allowedDomainIds: bulkVisibility === "DOMAIN_RESTRICTED" ? bulkDomainIds : [],
                    }),
                })
            )

            const results = await Promise.all(updatePromises)
            const successCount = results.filter(r => r.ok).length
            const failCount = results.length - successCount

            if (successCount > 0) {
                toast.success(`อัพเดท ${successCount} วิดีโอเรียบร้อย`)
            }
            if (failCount > 0) {
                toast.error(`อัพเดทไม่สำเร็จ ${failCount} วิดีโอ`)
            }

            setSelectedIds(new Set())
            setBulkEditDialogOpen(false)
            fetchVideos()
        } catch (error) {
            console.error("Bulk edit error:", error)
            toast.error("เกิดข้อผิดพลาดในการอัพเดท")
        } finally {
            setBulkEditLoading(false)
        }
    }

    const copyEmbedCode = (videoId: string) => {
        const embedCode = `<iframe src="${window.location.origin}/embed/${videoId}" width="100%" height="480" frameborder="0" allowfullscreen></iframe>`
        navigator.clipboard.writeText(embedCode)
        toast.success("Copied embed code")
    }

    const getStatusBadge = (status: Video["status"]) => {
        const styles = {
            READY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
            PROCESSING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
            FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
        }
        return <Badge variant="outline" className={styles[status]}>{status}</Badge>
    }

    const getVisibilityBadge = (visibility: Video["visibility"]) => {
        const styles = {
            PUBLIC: "bg-blue-500/20 text-blue-400 border-blue-500/30",
            PRIVATE: "bg-gray-500/20 text-gray-400 border-gray-500/30",
            DOMAIN_RESTRICTED: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        }
        const labels = {
            PUBLIC: "Public",
            PRIVATE: "Private",
            DOMAIN_RESTRICTED: "Domain",
        }
        return <Badge variant="outline" className={styles[visibility]}>{labels[visibility]}</Badge>
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search videos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="pl-9 bg-white/5 border-white/10"
                        />
                    </div>
                    <Select value={filterVisibility} onValueChange={setFilterVisibility}>
                        <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Visibility" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="PUBLIC">Public</SelectItem>
                            <SelectItem value="PRIVATE">Private</SelectItem>
                            <SelectItem value="DOMAIN_RESTRICTED">Domain</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                        <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
                            <ArrowUpDown className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest</SelectItem>
                            <SelectItem value="oldest">Oldest</SelectItem>
                            <SelectItem value="popular">Popular</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Bulk Actions */}
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            {selectedIds.size} selected
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={openBulkEditDialog}
                            className="bg-white/5 border-white/10"
                        >
                            <Settings className="h-4 w-4 mr-1" />
                            แก้ไขหลายรายการ
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(Array.from(selectedIds))}
                        >
                            <Trash2 className="h-4 w-4 mr-1" />
                            ลบ
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedIds(new Set())}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/10 hover:bg-white/5">
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={videos.length > 0 && selectedIds.size === videos.length}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="w-20">Thumb</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead className="w-28">Duration</TableHead>
                            <TableHead className="w-24">Views</TableHead>
                            <TableHead className="w-24">Status</TableHead>
                            <TableHead className="w-24">Visibility</TableHead>
                            <TableHead className="w-32">Created</TableHead>
                            <TableHead className="w-16"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-32">
                                    <div className="flex items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : videos.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-32">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                        <Play className="h-8 w-8 mb-2" />
                                        <p>No videos found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            videos.map((video) => (
                                <TableRow
                                    key={video.id}
                                    className="border-white/10 hover:bg-white/5"
                                    data-state={selectedIds.has(video.id) ? "selected" : undefined}
                                >
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.has(video.id)}
                                            onCheckedChange={() => toggleSelect(video.id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="relative w-16 aspect-video rounded overflow-hidden bg-white/10">
                                            {video.thumbnailUrl ? (
                                                <img
                                                    src={video.thumbnailUrl}
                                                    alt={video.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Play className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <Link
                                                href={`/videos/${video.id}`}
                                                className="font-medium text-white hover:text-primary transition-colors line-clamp-1"
                                            >
                                                {video.title}
                                            </Link>
                                            {video.pornstars && video.pornstars.length > 0 && (
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {video.pornstars.slice(0, 2).map(p => (
                                                        <Badge
                                                            key={p.pornstar.id}
                                                            variant="secondary"
                                                            className="text-[10px] h-4 bg-pink-500/20 text-pink-400 border-0"
                                                        >
                                                            {p.pornstar.name}
                                                        </Badge>
                                                    ))}
                                                    {video.pornstars.length > 2 && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            +{video.pornstars.length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatDuration(video.duration)}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Eye className="h-3 w-3" />
                                            {formatNumber(video.views)}
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(video.status)}</TableCell>
                                    <TableCell>{getVisibilityBadge(video.visibility)}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {new Date(video.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/videos/${video.id}/edit`}>
                                                        <Pencil className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => copyEmbedCode(video.id)}>
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Copy Embed
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/videos/${video.id}`} target="_blank">
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-400 focus:text-red-400"
                                                    onClick={() => handleDeleteClick([video.id])}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                        {pagination.total} videos
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            disabled={pagination.page <= 1}
                            className="bg-white/5 border-white/10"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                            Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            disabled={pagination.page >= pagination.totalPages}
                            className="bg-white/5 border-white/10"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ลบ {videosToDelete.length > 1 ? "วิดีโอ" : "วิดีโอ"}</DialogTitle>
                        <DialogDescription>
                            คุณต้องการลบ {videosToDelete.length > 1
                                ? `${videosToDelete.length} วิดีโอ`
                                : "วิดีโอนี้"
                            } หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            ลบ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Edit Dialog */}
            <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>แก้ไขหลายรายการ ({selectedIds.size} วิดีโอ)</DialogTitle>
                        <DialogDescription>
                            เลือกการตั้งค่าที่ต้องการเปลี่ยนแปลงสำหรับวิดีโอที่เลือกไว้
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Visibility Selection */}
                        <div className="space-y-2">
                            <Label className="text-white">การเผยแพร่</Label>
                            <Select value={bulkVisibility} onValueChange={setBulkVisibility}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue placeholder="เลือกการเผยแพร่" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PUBLIC">
                                        <div className="flex items-center gap-2">
                                            <Eye className="h-4 w-4 text-blue-400" />
                                            สาธารณะ (Public)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="PRIVATE">
                                        <div className="flex items-center gap-2">
                                            <Eye className="h-4 w-4 text-gray-400" />
                                            ส่วนตัว (Private)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="DOMAIN_RESTRICTED">
                                        <div className="flex items-center gap-2">
                                            <Globe className="h-4 w-4 text-purple-400" />
                                            เจาะจง Domain
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Domain Selection (shown only for DOMAIN_RESTRICTED) */}
                        {bulkVisibility === "DOMAIN_RESTRICTED" && (
                            <div className="space-y-2">
                                <Label className="text-white">Domains ที่อนุญาต</Label>
                                {activeDomains.length === 0 ? (
                                    <div className="rounded-md border border-dashed border-white/20 p-4 text-sm text-muted-foreground">
                                        ไม่มี Domains ที่ใช้งานอยู่ เพิ่ม Domains ใน{" "}
                                        <Link href="/admin" className="text-primary underline">
                                            Admin Settings
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {activeDomains.map((domain) => (
                                            <label
                                                key={domain.id}
                                                className="flex items-center gap-3 rounded-md border border-white/10 p-3 text-sm cursor-pointer hover:bg-white/5 transition-colors"
                                            >
                                                <Checkbox
                                                    checked={bulkDomainIds.includes(domain.id)}
                                                    onCheckedChange={() => toggleBulkDomain(domain.id)}
                                                />
                                                <Globe className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-white">{domain.domain}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setBulkEditDialogOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleBulkEdit} disabled={bulkEditLoading}>
                            {bulkEditLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            บันทึกการเปลี่ยนแปลง
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
