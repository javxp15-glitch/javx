"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Pencil, FolderOpen } from "lucide-react"
import { toast } from "sonner"

interface Category {
    id: string
    name: string
    slug: string
    description: string | null
    _count: {
        videos: number
    }
}

export function CategoryManager() {
    const [categories, setCategories] = useState<Category[]>([])
    const [newName, setNewName] = useState("")
    const [newSlug, setNewSlug] = useState("")
    const [newDescription, setNewDescription] = useState("")
    const [loading, setLoading] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [editSlug, setEditSlug] = useState("")
    const [editDescription, setEditDescription] = useState("")

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        try {
            const response = await fetch("/api/categories")
            if (response.ok) {
                const data = await response.json()
                setCategories(data.categories)
            }
        } catch (error) {
            console.error("Failed to fetch categories:", error)
        }
    }

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, "-")
            .replace(/^-+|-+$/g, "")
    }

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value
        setNewName(name)
        setNewSlug(generateSlug(name))
    }

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim()) return

        setLoading(true)
        try {
            const response = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newName.trim(),
                    slug: newSlug || generateSlug(newName),
                    description: newDescription.trim() || undefined,
                }),
            })

            if (response.ok) {
                toast.success("หมวดหมู่ถูกเพิ่มแล้ว")
                setNewName("")
                setNewSlug("")
                setNewDescription("")
                fetchCategories()
            } else {
                const data = await response.json()
                toast.error(data.error || "ไม่สามารถเพิ่มหมวดหมู่ได้")
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาด")
        } finally {
            setLoading(false)
        }
    }

    const startEditing = (category: Category) => {
        setEditingId(category.id)
        setEditName(category.name)
        setEditSlug(category.slug)
        setEditDescription(category.description || "")
    }

    const cancelEditing = () => {
        setEditingId(null)
        setEditName("")
        setEditSlug("")
        setEditDescription("")
    }

    const handleUpdateCategory = async (categoryId: string) => {
        if (!editName.trim()) return

        try {
            const response = await fetch(`/api/categories/${categoryId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName.trim(),
                    slug: editSlug,
                    description: editDescription.trim() || null,
                }),
            })

            if (response.ok) {
                toast.success("หมวดหมู่ถูกอัพเดทแล้ว")
                cancelEditing()
                fetchCategories()
            } else {
                const data = await response.json()
                toast.error(data.error || "ไม่สามารถอัพเดทหมวดหมู่ได้")
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาด")
        }
    }

    const handleDeleteCategory = async (categoryId: string) => {
        if (!confirm("คุณแน่ใจที่จะลบหมวดหมู่นี้หรือไม่?")) return

        try {
            const response = await fetch(`/api/categories/${categoryId}`, {
                method: "DELETE",
            })

            if (response.ok) {
                toast.success("ลบหมวดหมู่แล้ว")
                fetchCategories()
            } else {
                toast.error("ไม่สามารถลบหมวดหมู่ได้")
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาด")
        }
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleAddCategory} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">ชื่อหมวดหมู่</Label>
                        <Input
                            id="name"
                            placeholder="เช่น บันเทิง, กีฬา"
                            value={newName}
                            onChange={handleNameChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="slug">Slug</Label>
                        <Input
                            id="slug"
                            placeholder="auto-generated"
                            value={newSlug}
                            onChange={(e) => setNewSlug(e.target.value)}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">คำอธิบาย (ไม่จำเป็น)</Label>
                    <Input
                        id="description"
                        placeholder="คำอธิบายสั้นๆ"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                    />
                </div>
                <Button type="submit" disabled={loading || !newName.trim()}>
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มหมวดหมู่
                </Button>
            </form>

            <div className="space-y-2">
                <Label>หมวดหมู่ทั้งหมด ({categories.length})</Label>
                {categories.length === 0 ? (
                    <Card>
                        <CardContent className="py-6 text-center text-muted-foreground">
                            ยังไม่มีหมวดหมู่
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {categories.map((category) => (
                            <Card key={category.id}>
                                <CardContent className="py-3">
                                    {editingId === category.id ? (
                                        <div className="space-y-3">
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <Input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    placeholder="ชื่อหมวดหมู่"
                                                />
                                                <Input
                                                    value={editSlug}
                                                    onChange={(e) => setEditSlug(e.target.value)}
                                                    placeholder="Slug"
                                                />
                                            </div>
                                            <Input
                                                value={editDescription}
                                                onChange={(e) => setEditDescription(e.target.value)}
                                                placeholder="คำอธิบาย"
                                            />
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => handleUpdateCategory(category.id)}>
                                                    บันทึก
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={cancelEditing}>
                                                    ยกเลิก
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <span className="font-medium">{category.name}</span>
                                                    <span className="text-sm text-muted-foreground ml-2">/{category.slug}</span>
                                                    {category.description && (
                                                        <p className="text-sm text-muted-foreground">{category.description}</p>
                                                    )}
                                                </div>
                                                <Badge variant="secondary">{category._count.videos} วิดีโอ</Badge>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => startEditing(category)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(category.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
