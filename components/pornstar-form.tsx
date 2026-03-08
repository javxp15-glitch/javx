"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2, Upload, User } from "lucide-react"
import { generateSlug } from "@/lib/utils"

interface PornstarFormData {
    name: string
    nameJp: string
    slug: string
    avatar: string
    height: string
    cupSize: string
    bust: string
    waist: string
    hip: string
    birthday: string
    debutYear: string
    nationality: string
    bio: string
}

interface PornstarFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: Partial<PornstarFormData> & { id?: string }
    onSuccess?: () => void
}

export function PornstarForm({ open, onOpenChange, initialData, onSuccess }: PornstarFormProps) {
    const isEditing = !!initialData?.id
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<PornstarFormData>({
        name: initialData?.name || "",
        nameJp: initialData?.nameJp || "",
        slug: initialData?.slug || "",
        avatar: initialData?.avatar || "",
        height: initialData?.height || "",
        cupSize: initialData?.cupSize || "",
        bust: initialData?.bust || "",
        waist: initialData?.waist || "",
        hip: initialData?.hip || "",
        birthday: initialData?.birthday || "",
        debutYear: initialData?.debutYear || "",
        nationality: initialData?.nationality || "",
        bio: initialData?.bio || "",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload = {
                name: formData.name,
                nameJp: formData.nameJp || null,
                slug: formData.slug || generateSlug(formData.name),
                avatar: formData.avatar || null,
                height: formData.height ? parseInt(formData.height) : null,
                cupSize: formData.cupSize || null,
                bust: formData.bust ? parseInt(formData.bust) : null,
                waist: formData.waist ? parseInt(formData.waist) : null,
                hip: formData.hip ? parseInt(formData.hip) : null,
                birthday: formData.birthday || null,
                debutYear: formData.debutYear ? parseInt(formData.debutYear) : null,
                nationality: formData.nationality || null,
                bio: formData.bio || null,
            }

            const response = await fetch(
                isEditing ? `/api/pornstars/${initialData!.id}` : "/api/pornstars",
                {
                    method: isEditing ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            )

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Failed to save pornstar")
            }

            onOpenChange(false)
            onSuccess?.()
        } catch (error) {
            console.error("Failed to save pornstar:", error)
            alert(error instanceof Error ? error.message : "Failed to save pornstar")
        } finally {
            setLoading(false)
        }
    }

    const updateField = (field: keyof PornstarFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    // Auto-generate slug from name
    const handleNameChange = (name: string) => {
        setFormData(prev => ({
            ...prev,
            name,
            slug: prev.slug || generateSlug(name),
        }))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Pornstar" : "Add Pornstar"}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update the pornstar's information below."
                            : "Fill in the pornstar's information below."
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Avatar Preview */}
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                            {formData.avatar ? (
                                <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="h-10 w-10 text-muted-foreground" />
                            )}
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="avatar">Avatar URL</Label>
                            <Input
                                id="avatar"
                                placeholder="https://..."
                                value={formData.avatar}
                                onChange={(e) => updateField("avatar", e.target.value)}
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                    </div>

                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name (English) *</Label>
                            <Input
                                id="name"
                                required
                                placeholder="e.g., Hibiki Otsuki"
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nameJp">Name (Japanese)</Label>
                            <Input
                                id="nameJp"
                                placeholder="e.g., 大槻ひびき"
                                value={formData.nameJp}
                                onChange={(e) => updateField("nameJp", e.target.value)}
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                    </div>

                    {/* Slug */}
                    <div className="space-y-2">
                        <Label htmlFor="slug">Slug</Label>
                        <Input
                            id="slug"
                            placeholder="e.g., hibiki-otsuki"
                            value={formData.slug}
                            onChange={(e) => updateField("slug", e.target.value)}
                            className="bg-white/5 border-white/10"
                        />
                        <p className="text-xs text-muted-foreground">
                            URL-friendly identifier. Auto-generated from name if left empty.
                        </p>
                    </div>

                    {/* Body Measurements */}
                    <div className="space-y-3">
                        <Label className="text-base">Body Measurements</Label>
                        <div className="grid grid-cols-5 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="height" className="text-xs">Height (cm)</Label>
                                <Input
                                    id="height"
                                    type="number"
                                    placeholder="158"
                                    value={formData.height}
                                    onChange={(e) => updateField("height", e.target.value)}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="cupSize" className="text-xs">Cup Size</Label>
                                <Select
                                    value={formData.cupSize}
                                    onValueChange={(v) => updateField("cupSize", v)}
                                >
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue placeholder="Cup" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"].map(cup => (
                                            <SelectItem key={cup} value={cup}>{cup}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="bust" className="text-xs">Bust (cm)</Label>
                                <Input
                                    id="bust"
                                    type="number"
                                    placeholder="88"
                                    value={formData.bust}
                                    onChange={(e) => updateField("bust", e.target.value)}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="waist" className="text-xs">Waist (cm)</Label>
                                <Input
                                    id="waist"
                                    type="number"
                                    placeholder="58"
                                    value={formData.waist}
                                    onChange={(e) => updateField("waist", e.target.value)}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="hip" className="text-xs">Hip (cm)</Label>
                                <Input
                                    id="hip"
                                    type="number"
                                    placeholder="86"
                                    value={formData.hip}
                                    onChange={(e) => updateField("hip", e.target.value)}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Personal Info */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="birthday">Birthday</Label>
                            <Input
                                id="birthday"
                                type="date"
                                value={formData.birthday}
                                onChange={(e) => updateField("birthday", e.target.value)}
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="debutYear">Debut Year</Label>
                            <Input
                                id="debutYear"
                                type="number"
                                placeholder="2010"
                                value={formData.debutYear}
                                onChange={(e) => updateField("debutYear", e.target.value)}
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nationality">Nationality</Label>
                            <Input
                                id="nationality"
                                placeholder="e.g., Japanese"
                                value={formData.nationality}
                                onChange={(e) => updateField("nationality", e.target.value)}
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                            id="bio"
                            placeholder="Brief biography..."
                            rows={4}
                            value={formData.bio}
                            onChange={(e) => updateField("bio", e.target.value)}
                            className="bg-white/5 border-white/10"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {isEditing ? "Save Changes" : "Add Pornstar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
