"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { FolderOpen, ChevronDown, X } from "lucide-react"
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
    const [isSelectOpen, setIsSelectOpen] = useState(false)

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
            <Popover open={isSelectOpen} onOpenChange={setIsSelectOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between"
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
