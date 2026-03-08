"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, FolderOpen } from "lucide-react"
import { toast } from "sonner"

interface Category {
    id: string
    name: string
    slug: string
}

interface CategorySelectorProps {
    value: string
    onValueChange: (value: string) => void
    disabled?: boolean
}

export function CategorySelector({ value, onValueChange, disabled }: CategorySelectorProps) {
    const [categories, setCategories] = useState<Category[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [newName, setNewName] = useState("")
    const [newSlug, setNewSlug] = useState("")
    const [loading, setLoading] = useState(false)

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

    const handleNameChange = (name: string) => {
        setNewName(name)
        setNewSlug(generateSlug(name))
    }

    const handleCreate = async () => {
        if (!newName.trim()) return

        setLoading(true)
        try {
            const response = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newName.trim(),
                    slug: newSlug || generateSlug(newName),
                }),
            })

            if (response.ok) {
                const data = await response.json()
                toast.success("สร้างหมวดหมู่แล้ว")
                setNewName("")
                setNewSlug("")
                setIsOpen(false)
                await fetchCategories()
                onValueChange(data.category.id)
            } else {
                const data = await response.json()
                toast.error(data.error || "ไม่สามารถสร้างหมวดหมู่ได้")
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาด")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex gap-2">
            <Select value={value} onValueChange={onValueChange} disabled={disabled}>
                <SelectTrigger className="flex-1">
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">ไม่มีหมวดหมู่</SelectItem>
                    {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                            <span className="flex items-center gap-2">
                                <FolderOpen className="h-3 w-3" />
                                {category.name}
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="icon" disabled={disabled}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>สร้างหมวดหมู่ใหม่</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="category-name">ชื่อหมวดหมู่</Label>
                            <Input
                                id="category-name"
                                value={newName}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="เช่น บันเทิง, กีฬา"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category-slug">Slug</Label>
                            <Input
                                id="category-slug"
                                value={newSlug}
                                onChange={(e) => setNewSlug(e.target.value)}
                                placeholder="auto-generated"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsOpen(false)}>
                                ยกเลิก
                            </Button>
                            <Button onClick={handleCreate} disabled={loading || !newName.trim()}>
                                {loading ? "กำลังสร้าง..." : "สร้าง"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
