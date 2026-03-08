"use client"

import type React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X, Filter } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface Category {
  id: string
  name: string
}

export function VideoFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [category, setCategory] = useState(searchParams.get("categoryId") || "all")
  const [visibility, setVisibility] = useState(searchParams.get("visibility") || "all")
  const [sort, setSort] = useState(searchParams.get("sort") || "newest")
  const [categories, setCategories] = useState<Category[]>([])

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
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
    fetchCategories()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters()
  }

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (category !== "all") params.set("categoryId", category)
    if (visibility !== "all") params.set("visibility", visibility)
    if (sort !== "newest") params.set("sort", sort)
    params.set("page", "1")

    router.push(`/videos?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch("")
    setCategory("all")
    setVisibility("all")
    setSort("newest")
    router.push("/videos")
  }

  const hasActiveFilters = search || category !== "all" || visibility !== "all" || sort !== "newest"

  return (
    <div className="mb-8 space-y-4 rounded-2xl bg-white/5 border border-white/5 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search library..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-black/20 border-white/10 text-white placeholder:text-muted-foreground focus:ring-primary/20 focus:border-primary/50"
          />
        </form>

        {/* Filters Wrapper */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground mr-1 hidden sm:block" />

          {/* Category Filter */}
          <Select value={category} onValueChange={(value) => setCategory(value)}>
            <SelectTrigger className="w-[160px] bg-black/20 border-white/10 text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Visibility Filter */}
          <Select value={visibility} onValueChange={(value) => setVisibility(value)}>
            <SelectTrigger className="w-[140px] bg-black/20 border-white/10 text-white">
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Visibility</SelectItem>
              <SelectItem value="PUBLIC">Public</SelectItem>
              <SelectItem value="PRIVATE">Private</SelectItem>
              <SelectItem value="DOMAIN_RESTRICTED">Restricted</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sort} onValueChange={(value) => setSort(value)}>
            <SelectTrigger className="w-[140px] bg-black/20 border-white/10 text-white">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="popular">Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Apply/Clear */}
        <div className="flex gap-2">
          <Button onClick={applyFilters} size="sm" className="bg-primary hover:bg-primary/90 text-white">
            Apply
          </Button>
          {hasActiveFilters && (
            <Button onClick={clearFilters} variant="ghost" size="sm" className="text-muted-foreground hover:text-white hover:bg-white/10">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
