"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Search,
    Plus,
    ChevronLeft,
    ChevronRight,
    Loader2,
    User,
    Trash2,
    Pencil,
} from "lucide-react"
import Link from "next/link"
import { calculateAge, formatNumber } from "@/lib/utils"

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
    createdAt: string
    updatedAt: string
}

interface PornstarGridProps {
    onAdd?: () => void
    onEdit?: (pornstar: Pornstar) => void
    onDelete?: (pornstarId: string) => void
    selectable?: boolean
}

export function PornstarGrid({ onAdd, onEdit, onDelete, selectable }: PornstarGridProps) {
    const [pornstars, setPornstars] = useState<Pornstar[]>([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState({ page: 1, limit: 24, total: 0, totalPages: 1 })
    const [searchQuery, setSearchQuery] = useState("")
    const [sortBy, setSortBy] = useState<"videos" | "name" | "newest" | "debut">("videos")

    // Filters
    const [filterHeight, setFilterHeight] = useState<string>("all")
    const [filterCupSize, setFilterCupSize] = useState<string>("all")
    const [filterAge, setFilterAge] = useState<string>("all")
    const [filterDebutYear, setFilterDebutYear] = useState<string>("all")

    // Delete dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [pornstarToDelete, setPornstarToDelete] = useState<Pornstar | null>(null)

    const fetchPornstars = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set("page", pagination.page.toString())
            params.set("limit", pagination.limit.toString())
            params.set("sort", sortBy)
            if (searchQuery) params.set("search", searchQuery)

            // Height filter
            if (filterHeight !== "all") {
                const [min, max] = filterHeight.split("-")
                if (min) params.set("minHeight", min)
                if (max) params.set("maxHeight", max)
            }

            // Cup size filter
            if (filterCupSize !== "all") {
                params.set("cupSize", filterCupSize)
            }

            // Age filter
            if (filterAge !== "all") {
                const [min, max] = filterAge.split("-")
                if (min) params.set("minAge", min)
                if (max) params.set("maxAge", max)
            }

            // Debut year filter
            if (filterDebutYear !== "all") {
                params.set("minDebutYear", filterDebutYear)
                params.set("maxDebutYear", filterDebutYear)
            }

            const response = await fetch(`/api/pornstars?${params}`)
            if (response.ok) {
                const data = await response.json()
                setPornstars(data.pornstars)
                setPagination(prev => ({
                    ...prev,
                    total: data.pagination.total,
                    totalPages: data.pagination.totalPages
                }))
            }
        } catch (error) {
            console.error("Failed to fetch pornstars:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPornstars()
    }, [pagination.page, sortBy, filterHeight, filterCupSize, filterAge, filterDebutYear])

    const handleSearch = () => {
        setPagination(prev => ({ ...prev, page: 1 }))
        fetchPornstars()
    }

    const handleDeleteClick = (pornstar: Pornstar) => {
        setPornstarToDelete(pornstar)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!pornstarToDelete) return
        try {
            await fetch(`/api/pornstars/${pornstarToDelete.id}`, { method: "DELETE" })
            setDeleteDialogOpen(false)
            setPornstarToDelete(null)
            fetchPornstars()
        } catch (error) {
            console.error("Failed to delete pornstar:", error)
        }
    }

    // Generate debut year options (from 1990 to current year)
    const debutYears = Array.from(
        { length: new Date().getFullYear() - 1990 + 1 },
        (_, i) => (new Date().getFullYear() - i).toString()
    )

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="flex items-center gap-4 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="ค้นหานักแสดง..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-9 bg-white/5 border-white/10"
                    />
                </div>

                {/* Height Filter */}
                <Select value={filterHeight} onValueChange={setFilterHeight}>
                    <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
                        <SelectValue placeholder="ส่วนสูง" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">ทุกส่วนสูง</SelectItem>
                        <SelectItem value="140-149">140-149cm</SelectItem>
                        <SelectItem value="150-159">150-159cm</SelectItem>
                        <SelectItem value="160-169">160-169cm</SelectItem>
                        <SelectItem value="170-179">170-179cm</SelectItem>
                        <SelectItem value="180-200">180cm+</SelectItem>
                    </SelectContent>
                </Select>

                {/* Cup Size Filter */}
                <Select value={filterCupSize} onValueChange={setFilterCupSize}>
                    <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
                        <SelectValue placeholder="คัพ" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">ทุกคัพ</SelectItem>
                        {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"].map(cup => (
                            <SelectItem key={cup} value={cup}>{cup} Cup</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Age Filter */}
                <Select value={filterAge} onValueChange={setFilterAge}>
                    <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
                        <SelectValue placeholder="อายุ" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">ทุกอายุ</SelectItem>
                        <SelectItem value="18-24">18-24</SelectItem>
                        <SelectItem value="25-29">25-29</SelectItem>
                        <SelectItem value="30-34">30-34</SelectItem>
                        <SelectItem value="35-39">35-39</SelectItem>
                        <SelectItem value="40-100">40+</SelectItem>
                    </SelectContent>
                </Select>

                {/* Debut Year Filter */}
                <Select value={filterDebutYear} onValueChange={setFilterDebutYear}>
                    <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
                        <SelectValue placeholder="ปีเดบิวต์" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">ทุกปี</SelectItem>
                        {debutYears.slice(0, 20).map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
                        <SelectValue placeholder="เรียงตาม" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="videos">วิดีโอมากสุด</SelectItem>
                        <SelectItem value="name">ชื่อ</SelectItem>
                        <SelectItem value="newest">ใหม่ล่าสุด</SelectItem>
                        <SelectItem value="debut">ปีเดบิวต์</SelectItem>
                    </SelectContent>
                </Select>

                {/* Add Button */}
                {onAdd && (
                    <Button onClick={onAdd} className="ml-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        เพิ่มนักแสดง
                    </Button>
                )}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : pornstars.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <User className="h-12 w-12 mb-4" />
                    <p className="text-lg font-medium">ไม่พบนักแสดง</p>
                    <p className="text-sm">ลองปรับตัวกรองหรือเพิ่มนักแสดงใหม่</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {pornstars.map((pornstar) => (
                        <div key={pornstar.id} className="group relative">
                            <Link
                                href={`/admin/pornstars/${pornstar.id}`}
                                className="flex flex-col items-center text-center space-y-3"
                            >
                                {/* Circular Avatar */}
                                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-white/10 ring-2 ring-transparent group-hover:ring-primary transition-all">
                                    {pornstar.avatar ? (
                                        <img
                                            src={pornstar.avatar}
                                            alt={pornstar.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User className="h-10 w-10 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="space-y-0.5">
                                    <p className="font-medium text-white group-hover:text-primary transition-colors line-clamp-1">
                                        {pornstar.name}
                                    </p>
                                    <p className="text-sm text-primary">
                                        {formatNumber(pornstar.videoCount)} วิดีโอ
                                    </p>
                                    {pornstar.debutYear && (
                                        <p className="text-xs text-muted-foreground">
                                            เดบิวต์: {pornstar.debutYear}
                                        </p>
                                    )}
                                </div>
                            </Link>

                            {/* Action Buttons (on hover) */}
                            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                {onEdit && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 bg-black/60 hover:bg-black/80"
                                        onClick={(e) => { e.preventDefault(); onEdit(pornstar) }}
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                )}
                                {onDelete && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 bg-black/60 hover:bg-red-600"
                                        onClick={(e) => { e.preventDefault(); handleDeleteClick(pornstar) }}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        แสดง {(pagination.page - 1) * pagination.limit + 1} ถึง{" "}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} จาก{" "}
                        {pagination.total} นักแสดง
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ลบนักแสดง</DialogTitle>
                        <DialogDescription>
                            คุณแน่ใจหรือไม่ที่จะลบ {pornstarToDelete?.name}?
                            การดำเนินการนี้จะลบความเชื่อมโยงกับวิดีโอทั้งหมดด้วย
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
