"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <Button variant="ghost" asChild className="mb-4">
                    <Link href={`/videos/${videoId}`}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        กลับ
                    </Link>
                </Button>

                <div className="grid gap-8 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-2xl">แก้ไขวิดีโอ</CardTitle>
                            <CardDescription>แก้ไขข้อมูลวิดีโอ (ไม่สามารถเปลี่ยนไฟล์วิดีโอได้)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="title">ชื่อคลิป</Label>
                                    <Input
                                        id="title"
                                        placeholder="กรอกชื่อวิดีโอคลิป"
                                        value={title}
                                        onChange={(event) => setTitle(event.target.value)}
                                    />
                                    {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">รายละเอียด</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="เพิ่มคำอธิบายสั้น ๆ สำหรับผู้ชม"
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                        rows={4}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>หมวดหมู่</Label>
                                    <MultiCategorySelector value={categoryIds} onValueChange={setCategoryIds} />
                                </div>

                                <div className="space-y-2">
                                    <Label>การเผยแพร่</Label>
                                    <Select value={visibility} onValueChange={(value) => setVisibility(value as Visibility)}>
                                        <SelectTrigger>
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
                                        <Label>Domains ที่อนุญาต</Label>
                                        {activeDomains.length === 0 ? (
                                            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
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
                                                        className="flex items-center gap-2 rounded-md border p-3 text-sm cursor-pointer"
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
                                    <Label htmlFor="thumbnail-file">เปลี่ยนรูปหน้าปก (ไม่บังคับ)</Label>
                                    <Input
                                        id="thumbnail-file"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={(event) => setThumbnailFile(event.target.files?.[0] ?? null)}
                                    />
                                    {thumbnailFile && <p className="text-sm text-muted-foreground">{thumbnailFile.name}</p>}
                                </div>

                                <Button type="submit" disabled={saving}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {saving ? "กำลังบันทึก..." : "บันทึก"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>ข้อมูลไฟล์</CardTitle>
                                <CardDescription>ไม่สามารถแก้ไขได้</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>ขนาดไฟล์</span>
                                    <span className="text-foreground">{formatFileSize(video.fileSize)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ความยาว</span>
                                    <span className="text-foreground">{formatDuration(video.duration)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ชนิดไฟล์</span>
                                    <span className="text-foreground">{video.mimeType || "N/A"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>สถานะ</span>
                                    <span className="text-foreground">{video.status}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>หน้าปกปัจจุบัน</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {video.thumbnailUrl ? (
                                    <img
                                        src={video.thumbnailUrl}
                                        alt="Thumbnail"
                                        className="w-full aspect-video object-cover rounded-lg"
                                    />
                                ) : (
                                    <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
                                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
