"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Tag, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface TagData {
    id: string
    name: string
    slug: string
}

interface MultiTagSelectorProps {
    value: string[]
    onValueChange: (value: string[]) => void
}

export function MultiTagSelector({ value, onValueChange }: MultiTagSelectorProps) {
    const [open, setOpen] = useState(false)
    const [tags, setTags] = useState<TagData[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchTags() {
            try {
                const response = await fetch("/api/tags?limit=100")
                if (response.ok) {
                    const data = await response.json()
                    setTags(data.tags)
                }
            } catch (error) {
                console.error("Failed to fetch tags:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchTags()
    }, [])

    const selectedTags = tags.filter(t => value.includes(t.id))

    const toggleTag = (tagId: string) => {
        if (value.includes(tagId)) {
            onValueChange(value.filter(id => id !== tagId))
        } else {
            onValueChange([...value, tagId])
        }
    }

    const removeTag = (tagId: string) => {
        onValueChange(value.filter(id => id !== tagId))
    }

    return (
        <div className="space-y-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10"
                    >
                        <span className="text-muted-foreground">
                            {value.length === 0
                                ? "เลือก Tags..."
                                : `${value.length} selected`
                            }
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                    <Command>
                        <CommandInput placeholder="ค้นหา tag..." />
                        <CommandList>
                            <CommandEmpty>ไม่พบ tag</CommandEmpty>
                            <CommandGroup>
                                {loading ? (
                                    <CommandItem disabled>กำลังโหลด...</CommandItem>
                                ) : (
                                    tags.map((tag) => (
                                        <CommandItem
                                            key={tag.id}
                                            value={tag.name}
                                            onSelect={() => toggleTag(tag.id)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value.includes(tag.id) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <Tag className="mr-2 h-3 w-3 text-muted-foreground" />
                                            <span>#{tag.name}</span>
                                        </CommandItem>
                                    ))
                                )}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Selected Tags */}
            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                        <Badge
                            key={tag.id}
                            variant="secondary"
                            className="bg-white/10 text-white border-0 pr-1"
                        >
                            #{tag.name}
                            <button
                                type="button"
                                onClick={() => removeTag(tag.id)}
                                className="ml-1 p-0.5 hover:bg-white/20 rounded"
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
