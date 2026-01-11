"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, ImageIcon, Film, ImagePlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MultiCategorySelector } from "@/components/multi-category-selector"

interface Domain {
    id: string
    domain: string
    isActive: boolean
}

interface AllowedDomainRelation {
    domain: {
        id: string
        domain: string
    }
}

interface CategoryRelation {
    category: {
        id: string
        name: string
    }
}

interface Video {
    id: string
    title: string
    description: string | null
    visibility: "PUBLIC" | "PRIVATE" | "DOMAIN_RESTRICTED"
    status: string
    videoUrl: string
    thumbnailUrl: string | null
    duration: number | null
    fileSize: number | null
    mimeType: string | null
    categories: CategoryRelation[]
    allowedDomains: AllowedDomainRelation[]
    createdBy: { id: string; name: string | null; email: string }
}

type Visibility = "PUBLIC" | "PRIVATE" | "DOMAIN_RESTRICTED"

interface EditVideoPageProps {
    params: Promise<{ id: string }>
}

export default function EditVideoPage({ params }: EditVideoPageProps) {
    const router = useRouter()
    const [videoId, setVideoId] = useState<string>("")

    const [video, setVideo] = useState<Video | null>(null)
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [categoryIds, setCategoryIds] = useState<string[]>([])
    const [visibility, setVisibility] = useState<Visibility>("PUBLIC")
    const [allowedDomainIds, setAllowedDomainIds] = useState<string[]>([])
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
    const [domains, setDomains] = useState<Domain[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        params.then((p) => setVideoId(p.id))
    }, [params])

    useEffect(() => {
        if (!videoId) return

        async function fetchVideo() {
            try {
                const response = await fetch(`/api/videos/${videoId}`)
                if (response.ok) {
                    const data = await response.json()
                    const v = data.video as Video
                    setVideo(v)
                    setTitle(v.title)
                    setDescription(v.description || "")
                    setCategoryIds(v.categories?.map((c) => c.category.id) || [])
                    setVisibility(v.visibility)
                    setAllowedDomainIds(v.allowedDomains?.map((d) => d.domain.id) || [])
                } else {
                    toast.error("ไม่พบวิดีโอ")
                    router.push("/videos")
                }
            } catch (error) {
                console.error("Failed to fetch video:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchVideo()
    }, [videoId, router])

    useEffect(() => {
        if (visibility !== "DOMAIN_RESTRICTED") {
            return
        }

        async function fetchDomains() {
            try {
                const response = await fetch("/api/domains", { credentials: "include" })
                if (response.ok) {
                    const data = await response.json()
                    setDomains(data.domains)
                }
            } catch (error) {
                console.error("Failed to fetch domains:", error)
            }
        }

        fetchDomains()
    }, [visibility])

    const activeDomains = useMemo(() => domains.filter((d) => d.isActive), [domains])

    const toggleDomain = (domainId: string) => {
        setAllowedDomainIds((current) =>
            current.includes(domainId) ? current.filter((id) => id !== domainId) : [...current, domainId],
        )
    }

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return "N/A"
        const mb = bytes / (1024 * 1024)
        return `${mb.toFixed(2)} MB`
    }

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return "N/A"
        const min = Math.floor(seconds / 60)
        const sec = seconds % 60
        return `${min}:${sec.toString().padStart(2, "0")}`
    }

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault()
        const nextErrors: Record<string, string> = {}

        if (!title.trim()) {
            nextErrors.title = "กรุณากรอกชื่อ"
        }
        if (visibility === "DOMAIN_RESTRICTED" && allowedDomainIds.length === 0) {
            nextErrors.allowedDomainIds = "กรุณาเลือกอย่างน้อย 1 โดเมน"
        }

        setErrors(nextErrors)
        if (Object.keys(nextErrors).length > 0) {
            return
        }

        setSaving(true)

        try {
            const response = await fetch(`/api/videos/${videoId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() || null,
                    categoryIds: categoryIds,
                    visibility,
                    allowedDomainIds: visibility === "DOMAIN_RESTRICTED" ? allowedDomainIds : undefined,
                }),
            })

            const result = await response.json()
            if (!response.ok) {
                throw new Error(result.error || "ไม่สามารถบันทึกได้")
            }

            toast.success("บันทึกเรียบร้อย")
            router.push(`/videos/${videoId}`)
            router.refresh()
        } catch (error) {
            const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาด"
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-muted-foreground">กำลังโหลด...</div>
            </div>
        )
    }

    if (!video) {
        return null
    }

    return (
        <div className="min-h-screen bg-background relative">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto px-4 py-24 relative z-10">
                <Button variant="ghost" asChild className="mb-6 text-muted-foreground hover:text-white">
                    <Link href={`/videos/${videoId}`}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        กลับ
                    </Link>
                </Button>

                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 flex items-center gap-2">
                                <Film className="h-6 w-6 text-primary" />
                                แก้ไขวิดีโอ
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1">แก้ไขข้อมูลวิดีโอ (ไม่สามารถเปลี่ยนไฟล์วิดีโอได้)</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-gray-300">ชื่อคลิป</Label>
                                <Input
                                    id="title"
                                    placeholder="กรอกชื่อวิดีโอคลิป"
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    className="bg-white/5 border-white/10 focus:border-primary/50"
                                />
                                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-gray-300">รายละเอียด</Label>
                                <Textarea
                                    id="description"
                                    placeholder="เพิ่มคำอธิบายสั้น ๆ สำหรับผู้ชม"
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    rows={4}
                                    className="bg-white/5 border-white/10 focus:border-primary/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-gray-300">หมวดหมู่</Label>
                                <MultiCategorySelector value={categoryIds} onValueChange={setCategoryIds} />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-gray-300">การเผยแพร่</Label>
                                <Select value={visibility} onValueChange={(value) => setVisibility(value as Visibility)}>
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue placeholder="การเผยแพร่" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PUBLIC">เผยแพร่</SelectItem>
                                        <SelectItem value="PRIVATE">ส่วนตัว</SelectItem>
                                        <SelectItem value="DOMAIN_RESTRICTED">เจาะจง Domain</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {visibility === "DOMAIN_RESTRICTED" && (
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Domains ที่อนุญาต</Label>
                                    {activeDomains.length === 0 ? (
                                        <div className="rounded-md border border-dashed border-white/10 p-4 text-sm text-muted-foreground">
                                            ไม่มี Domains ที่ใช้งานอยู่ เพิ่ม Domains ใน{" "}
                                            <Link href="/admin" className="text-primary underline">
                                                การตั้งค่าแอดมิน
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {activeDomains.map((domain) => (
                                                <label
                                                    key={domain.id}
                                                    className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 p-3 text-sm cursor-pointer hover:bg-white/10 transition-colors"
                                                >
                                                    <Checkbox
                                                        checked={allowedDomainIds.includes(domain.id)}
                                                        onCheckedChange={() => toggleDomain(domain.id)}
                                                    />
                                                    <span>{domain.domain}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                    {errors.allowedDomainIds && <p className="text-sm text-destructive">{errors.allowedDomainIds}</p>}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-gray-300">เปลี่ยนรูปหน้าปก (ไม่บังคับ)</Label>
                                <label
                                    htmlFor="thumbnail-file"
                                    className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/20 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all"
                                >
                                    <div className="flex flex-col items-center justify-center">
                                        <ImagePlus className="w-6 h-6 mb-1 text-accent" />
                                        <p className="text-sm text-white font-medium">
                                            {thumbnailFile ? thumbnailFile.name : "เลือกรูปหน้าปกใหม่"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">JPG, PNG, WebP</p>
                                    </div>
                                    <input
                                        id="thumbnail-file"
                                        type="file"
                                        className="hidden"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={(event) => setThumbnailFile(event.target.files?.[0] ?? null)}
                                    />
                                </label>
                            </div>

                            <Button
                                type="submit"
                                disabled={saving}
                                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? "กำลังบันทึก..." : "บันทึก"}
                            </Button>
                        </form>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">ข้อมูลไฟล์</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">ขนาดไฟล์</span>
                                    <span className="text-white">{formatFileSize(video.fileSize)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">ความยาว</span>
                                    <span className="text-white">{formatDuration(video.duration)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">ชนิดไฟล์</span>
                                    <span className="text-white">{video.mimeType || "N/A"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">สถานะ</span>
                                    <span className="text-white">{video.status}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">หน้าปกปัจจุบัน</h3>
                            {video.thumbnailUrl ? (
                                <img
                                    src={video.thumbnailUrl}
                                    alt="Thumbnail"
                                    className="w-full aspect-video object-cover rounded-lg"
                                />
                            ) : (
                                <div className="w-full aspect-video bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
