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
  Trash2,
  Globe,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

interface Domain {
  id: string
  domain: string
  isActive: boolean
  createdAt: string
}

export function DomainManager() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [domainToDelete, setDomainToDelete] = useState<Domain | null>(null)

  // Form state
  const [formDomain, setFormDomain] = useState("")
  const [formLoading, setFormLoading] = useState(false)

  const fetchDomains = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/domains")
      if (response.ok) {
        const data = await response.json()
        setDomains(data.domains)
      }
    } catch (error) {
      console.error("Failed to fetch domains:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDomains()
  }, [])

  const filteredDomains = domains.filter(d =>
    d.domain.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const openAddDialog = () => {
    setFormDomain("")
    setFormOpen(true)
  }

  const handleSave = async () => {
    setFormLoading(true)
    try {
      const response = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: formDomain }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success("เพิ่มโดเมนแล้ว")
      setFormOpen(false)
      fetchDomains()
    } catch (error) {
      console.error("Failed to save domain:", error)
      toast.error(error instanceof Error ? error.message : "ไม่สามารถบันทึกได้")
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteClick = (domain: Domain) => {
    setDomainToDelete(domain)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!domainToDelete) return
    try {
      await fetch(`/api/domains/${domainToDelete.id}`, { method: "DELETE" })
      toast.success("ลบโดเมนแล้ว")
      setDeleteDialogOpen(false)
      setDomainToDelete(null)
      fetchDomains()
    } catch (error) {
      console.error("Failed to delete domain:", error)
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
            placeholder="ค้นหาโดเมน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-white/10"
          />
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มโดเมน
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead>โดเมน</TableHead>
              <TableHead className="w-24">สถานะ</TableHead>
              <TableHead className="w-32">วันที่เพิ่ม</TableHead>
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
            ) : filteredDomains.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Globe className="h-8 w-8 mb-2" />
                    <p>ไม่มีโดเมน</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredDomains.map((domain) => (
                <TableRow key={domain.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium">{domain.domain}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={domain.isActive
                        ? "bg-green-500/20 text-green-400"
                        : "bg-gray-500/20 text-gray-400"
                      }
                    >
                      {domain.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(domain.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-red-400 focus:text-red-400"
                          onClick={() => handleDeleteClick(domain)}
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

      {/* Add Domain Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มโดเมน</DialogTitle>
            <DialogDescription>
              กรอกโดเมนที่อนุญาตให้ฝังวิดีโอที่มีการจำกัดโดเมน
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">โดเมน</label>
              <Input
                placeholder="example.com หรือ https://example.com"
                value={formDomain}
                onChange={(e) => setFormDomain(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={formLoading || !formDomain}>
              {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              เพิ่มโดเมน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบโดเมน</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบ "{domainToDelete?.domain}"?
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
