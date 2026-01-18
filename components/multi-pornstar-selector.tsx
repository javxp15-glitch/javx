"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, User, Plus, X } from "lucide-react"
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

interface Pornstar {
    id: string
    name: string
    nameJp: string | null
    avatar: string | null
}

interface MultiPornstarSelectorProps {
    value: string[]
    onValueChange: (value: string[]) => void
}

export function MultiPornstarSelector({ value, onValueChange }: MultiPornstarSelectorProps) {
    const [open, setOpen] = useState(false)
    const [pornstars, setPornstars] = useState<Pornstar[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchPornstars() {
            try {
                const response = await fetch("/api/pornstars?limit=100")
                if (response.ok) {
                    const data = await response.json()
                    setPornstars(data.pornstars)
                }
            } catch (error) {
                console.error("Failed to fetch pornstars:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchPornstars()
    }, [])

    const selectedPornstars = pornstars.filter(p => value.includes(p.id))

    const togglePornstar = (pornstarId: string) => {
        if (value.includes(pornstarId)) {
            onValueChange(value.filter(id => id !== pornstarId))
        } else {
            onValueChange([...value, pornstarId])
        }
    }

    const removePornstar = (pornstarId: string) => {
        onValueChange(value.filter(id => id !== pornstarId))
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
                                ? "เลือก Pornstars..."
                                : `${value.length} selected`
                            }
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                    <Command>
                        <CommandInput placeholder="ค้นหา pornstar..." />
                        <CommandList>
                            <CommandEmpty>ไม่พบ pornstar</CommandEmpty>
                            <CommandGroup>
                                {loading ? (
                                    <CommandItem disabled>กำลังโหลด...</CommandItem>
                                ) : (
                                    pornstars.map((pornstar) => (
                                        <CommandItem
                                            key={pornstar.id}
                                            value={pornstar.name}
                                            onSelect={() => togglePornstar(pornstar.id)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value.includes(pornstar.id) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex items-center gap-2">
                                                {pornstar.avatar ? (
                                                    <img src={pornstar.avatar} alt={pornstar.name} className="w-5 h-5 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center">
                                                        <User className="h-3 w-3 text-pink-400" />
                                                    </div>
                                                )}
                                                <span>{pornstar.name}</span>
                                                {pornstar.nameJp && (
                                                    <span className="text-xs text-muted-foreground">({pornstar.nameJp})</span>
                                                )}
                                            </div>
                                        </CommandItem>
                                    ))
                                )}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Selected Pornstars */}
            {selectedPornstars.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedPornstars.map((pornstar) => (
                        <Badge
                            key={pornstar.id}
                            variant="secondary"
                            className="bg-pink-500/20 text-pink-400 border-0 pr-1"
                        >
                            {pornstar.name}
                            <button
                                type="button"
                                onClick={() => removePornstar(pornstar.id)}
                                className="ml-1 p-0.5 hover:bg-pink-500/30 rounded"
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
