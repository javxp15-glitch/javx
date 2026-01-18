"use client"

import { useState, useEffect } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Plus,
    Search,
    MoreHorizontal,
    Pencil,
    Trash2,
    Tag,
    Loader2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"
import { formatNumber, generateSlug } from "@/lib/utils"
import { toast } from "sonner"

interface TagData {
    id: string
    name: string
    slug: string
    usage: number
    videoCount: number
    createdAt: string
}

export function TagManager() {
    const [tags, setTags] = useState<TagData[]>([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 })
    const [searchQuery, setSearchQuery] = useState("")

    // Dialogs
    const [formOpen, setFormOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editingTag, setEditingTag] = useState<TagData | null>(null)
    const [tagToDelete, setTagToDelete] = useState<TagData | null>(null)

    // Form state
    const [formName, setFormName] = useState("")
    const [formSlug, setFormSlug] = useState("")
    const [formLoading, setFormLoading] = useState(false)

    const fetchTags = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set("page", pagination.page.toString())
            params.set("limit", pagination.limit.toString())
            params.set("sort", "usage")
            if (searchQuery) params.set("search", searchQuery)

            const response = await fetch(`/api/tags?${params}`)
            if (response.ok) {
                const data = await response.json()
                setTags(data.tags)
                setPagination(prev => ({
                    ...prev,
                    total: data.pagination.total,
                    totalPages: data.pagination.totalPages
                }))
            }
        } catch (error) {
            console.error("Failed to fetch tags:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTags()
    }, [pagination.page])

    const handleSearch = () => {
        setPagination(prev => ({ ...prev, page: 1 }))
        fetchTags()
    }

    const openAddDialog = () => {
        setEditingTag(null)
        setFormName("")
        setFormSlug("")
        setFormOpen(true)
    }

    const openEditDialog = (tag: TagData) => {
        setEditingTag(tag)
        setFormName(tag.name)
        setFormSlug(tag.slug)
        setFormOpen(true)
    }

    const handleSave = async () => {
        setFormLoading(true)
        try {
            const payload = {
                name: formName,
                slug: formSlug || generateSlug(formName),
            }

            const response = await fetch(
                editingTag ? `/api/tags/${editingTag.id}` : "/api/tags",
                {
                    method: editingTag ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            )

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error)
            }

            toast.success(editingTag ? "อัพเดทแท็กแล้ว" : "เพิ่มแท็กแล้ว")
            setFormOpen(false)
            fetchTags()
        } catch (error) {
            console.error("Failed to save tag:", error)
            toast.error(error instanceof Error ? error.message : "ไม่สามารถบันทึกได้")
        } finally {
            setFormLoading(false)
        }
    }

    const handleDeleteClick = (tag: TagData) => {
        setTagToDelete(tag)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!tagToDelete) return
        try {
            await fetch(`/api/tags/${tagToDelete.id}`, { method: "DELETE" })
            toast.success("ลบแท็กแล้ว")
            setDeleteDialogOpen(false)
            setTagToDelete(null)
            fetchTags()
        } catch (error) {
            console.error("Failed to delete tag:", error)
            toast.error("ไม่สามารถลบได้")
        }
    }

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="ค้นหาแท็ก..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-9 bg-white/5 border-white/10"
                    />
                </div>
                <Button onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มแท็ก
                </Button>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/10 hover:bg-white/5">
                            <TableHead>ชื่อ</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead className="w-24">วิดีโอ</TableHead>
                            <TableHead className="w-32">วันที่สร้าง</TableHead>
                            <TableHead className="w-16"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32">
                                    <div className="flex items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : tags.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                        <Tag className="h-8 w-8 mb-2" />
                                        <p>ไม่พบแท็ก</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            tags.map((tag) => (
                                <TableRow key={tag.id} className="border-white/10 hover:bg-white/5">
                                    <TableCell className="font-medium">{tag.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{tag.slug}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-primary/20 text-primary">
                                            {formatNumber(tag.videoCount)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {new Date(tag.createdAt).toLocaleDateString("th-TH")}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditDialog(tag)}>
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    แก้ไข
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-400 focus:text-red-400"
                                                    onClick={() => handleDeleteClick(tag)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    ลบ
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
                        แสดง {(pagination.page - 1) * pagination.limit + 1} ถึง{" "}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} จาก{" "}
                        {pagination.total} แท็ก
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
                            หน้า {pagination.page} จาก {pagination.totalPages}
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

            {/* Add/Edit Tag Dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTag ? "แก้ไขแท็ก" : "เพิ่มแท็ก"}</DialogTitle>
                        <DialogDescription>
                            {editingTag
                                ? "แก้ไขข้อมูลแท็กด้านล่าง"
                                : "กรอกข้อมูลแท็กใหม่"
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">ชื่อ</label>
                            <Input
                                placeholder="เช่น Creampie"
                                value={formName}
                                onChange={(e) => {
                                    setFormName(e.target.value)
                                    if (!editingTag) setFormSlug(generateSlug(e.target.value))
                                }}
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Slug</label>
                            <Input
                                placeholder="auto-generated"
                                value={formSlug}
                                onChange={(e) => setFormSlug(e.target.value)}
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setFormOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleSave} disabled={formLoading || !formName}>
                            {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingTag ? "บันทึก" : "เพิ่มแท็ก"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ลบแท็ก</DialogTitle>
                        <DialogDescription>
                            คุณแน่ใจหรือไม่ที่จะลบ "{tagToDelete?.name}"?
                            แท็กนี้จะถูกลบออกจากวิดีโอที่เกี่ยวข้องทั้งหมด
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
        </div>
    )
}
