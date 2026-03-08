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
    FolderOpen,
    Loader2,
} from "lucide-react"
import { formatNumber } from "@/lib/utils"
import { toast } from "sonner"

interface Category {
    id: string
    name: string
    slug: string
    description: string | null
    _count: {
        videos: number
    }
    createdAt: string
}

export function CategoryManager() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    // Dialogs
    const [formOpen, setFormOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

    // Form state
    const [formName, setFormName] = useState("")
    const [formSlug, setFormSlug] = useState("")
    const [formDescription, setFormDescription] = useState("")
    const [formLoading, setFormLoading] = useState(false)

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, "-")
            .replace(/^-+|-+$/g, "")
    }

    const fetchCategories = async () => {
        setLoading(true)
        try {
            const response = await fetch("/api/categories")
            if (response.ok) {
                const data = await response.json()
                setCategories(data.categories)
            }
        } catch (error) {
            console.error("Failed to fetch categories:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCategories()
    }, [])

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.slug.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const openAddDialog = () => {
        setEditingCategory(null)
        setFormName("")
        setFormSlug("")
        setFormDescription("")
        setFormOpen(true)
    }

    const openEditDialog = (category: Category) => {
        setEditingCategory(category)
        setFormName(category.name)
        setFormSlug(category.slug)
        setFormDescription(category.description || "")
        setFormOpen(true)
    }

    const handleSave = async () => {
        setFormLoading(true)
        try {
            const payload = {
                name: formName,
                slug: formSlug || generateSlug(formName),
                description: formDescription || null,
            }

            const response = await fetch(
                editingCategory ? `/api/categories/${editingCategory.id}` : "/api/categories",
                {
                    method: editingCategory ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            )

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error)
            }

            toast.success(editingCategory ? "อัพเดทหมวดหมู่แล้ว" : "เพิ่มหมวดหมู่แล้ว")
            setFormOpen(false)
            fetchCategories()
        } catch (error) {
            console.error("Failed to save category:", error)
            toast.error(error instanceof Error ? error.message : "ไม่สามารถบันทึกได้")
        } finally {
            setFormLoading(false)
        }
    }

    const handleDeleteClick = (category: Category) => {
        setCategoryToDelete(category)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!categoryToDelete) return
        try {
            await fetch(`/api/categories/${categoryToDelete.id}`, { method: "DELETE" })
            toast.success("ลบหมวดหมู่แล้ว")
            setDeleteDialogOpen(false)
            setCategoryToDelete(null)
            fetchCategories()
        } catch (error) {
            console.error("Failed to delete category:", error)
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
                        placeholder="ค้นหาหมวดหมู่..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white/5 border-white/10"
                    />
                </div>
                <Button onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มหมวดหมู่
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
                            <TableHead className="w-16"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32">
                                    <div className="flex items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredCategories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                        <FolderOpen className="h-8 w-8 mb-2" />
                                        <p>ไม่พบหมวดหมู่</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCategories.map((category) => (
                                <TableRow key={category.id} className="border-white/10 hover:bg-white/5">
                                    <TableCell className="font-medium">{category.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-primary/20 text-primary">
                                            {formatNumber(category._count.videos)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditDialog(category)}>
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    แก้ไข
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-400 focus:text-red-400"
                                                    onClick={() => handleDeleteClick(category)}
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

            {/* Add/Edit Dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}</DialogTitle>
                        <DialogDescription>
                            {editingCategory
                                ? "แก้ไขข้อมูลหมวดหมู่ด้านล่าง"
                                : "กรอกข้อมูลหมวดหมู่ใหม่"
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">ชื่อ</label>
                            <Input
                                placeholder="เช่น บันเทิง, กีฬา"
                                value={formName}
                                onChange={(e) => {
                                    setFormName(e.target.value)
                                    if (!editingCategory) setFormSlug(generateSlug(e.target.value))
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
                        <div className="space-y-2">
                            <label className="text-sm font-medium">คำอธิบาย (ไม่บังคับ)</label>
                            <Input
                                placeholder="คำอธิบายสั้นๆ"
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
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
                            {editingCategory ? "บันทึก" : "เพิ่มหมวดหมู่"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ลบหมวดหมู่</DialogTitle>
                        <DialogDescription>
                            คุณแน่ใจหรือไม่ที่จะลบ "{categoryToDelete?.name}"?
                            หมวดหมู่นี้จะถูกลบออกจากวิดีโอที่เกี่ยวข้องทั้งหมด
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
