"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Plus, FolderOpen, ChevronDown, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Category {
    id: string
    name: string
    slug: string
}

interface MultiCategorySelectorProps {
    value: string[]
    onValueChange: (value: string[]) => void
    disabled?: boolean
}

export function MultiCategorySelector({ value, onValueChange, disabled }: MultiCategorySelectorProps) {
    const [categories, setCategories] = useState<Category[]>([])
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isSelectOpen, setIsSelectOpen] = useState(false)
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
                setIsCreateOpen(false)
                await fetchCategories()
                // Auto-select the new category
                onValueChange([...value, data.category.id])
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

    const toggleCategory = (categoryId: string) => {
        if (value.includes(categoryId)) {
            onValueChange(value.filter((id) => id !== categoryId))
        } else {
            onValueChange([...value, categoryId])
        }
    }

    const removeCategory = (categoryId: string) => {
        onValueChange(value.filter((id) => id !== categoryId))
    }

    const selectedCategories = categories.filter((cat) => value.includes(cat.id))

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <Popover open={isSelectOpen} onOpenChange={setIsSelectOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1 justify-between"
                            disabled={disabled}
                        >
                            <span className="text-muted-foreground">
                                {value.length === 0 ? "เลือกหมวดหมู่" : `เลือกแล้ว ${value.length} หมวดหมู่`}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                        <div className="p-2 border-b">
                            <p className="text-sm font-medium">เลือกหมวดหมู่</p>
                            <p className="text-xs text-muted-foreground">คลิกเพื่อเลือกหลายหมวดหมู่</p>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto p-1">
                            {categories.length === 0 ? (
                                <div className="py-4 text-center text-sm text-muted-foreground">
                                    ยังไม่มีหมวดหมู่
                                </div>
                            ) : (
                                categories.map((category) => (
                                    <label
                                        key={category.id}
                                        className={cn(
                                            "flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer hover:bg-accent",
                                            value.includes(category.id) && "bg-accent"
                                        )}
                                    >
                                        <Checkbox
                                            checked={value.includes(category.id)}
                                            onCheckedChange={() => toggleCategory(category.id)}
                                        />
                                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{category.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </PopoverContent>
                </Popover>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
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

            {/* Selected categories as badges */}
            {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {selectedCategories.map((category) => (
                        <Badge
                            key={category.id}
                            variant="secondary"
                            className="flex items-center gap-1 pr-1"
                        >
                            {category.name}
                            <button
                                type="button"
                                onClick={() => removeCategory(category.id)}
                                className="rounded-full p-0.5 hover:bg-muted"
                                disabled={disabled}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    )
}
