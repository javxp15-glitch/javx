"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, UploadCloud } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface Category {
  id: string
  name: string
}

interface Domain {
  id: string
  domain: string
  isActive: boolean
}

type Visibility = "PUBLIC" | "PRIVATE" | "DOMAIN_RESTRICTED"

export default function UploadVideoPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState<string>("none")
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC")
  const [allowedDomainIds, setAllowedDomainIds] = useState<string[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  useEffect(() => {
    if (visibility !== "DOMAIN_RESTRICTED") {
      setAllowedDomainIds([])
    }

    if (visibility !== "DOMAIN_RESTRICTED") {
      return
    }

    async function fetchDomains() {
      try {
        const response = await fetch("/api/domains", { credentials: "include" })
        if (response.ok) {
          const data = await response.json()
          setDomains(data.domains)
        } else if (response.status === 403) {
          toast.error("Only admins can manage domain restrictions.")
        }
      } catch (error) {
        console.error("Failed to fetch domains:", error)
      }
    }

    fetchDomains()
  }, [visibility])

  const activeDomains = useMemo(() => domains.filter((domain) => domain.isActive), [domains])

  const toggleDomain = (domainId: string) => {
    setAllowedDomainIds((current) =>
      current.includes(domainId) ? current.filter((id) => id !== domainId) : [...current, domainId],
    )
  }

  /**
   * 1. Get Presigned URL from API
   * 2. Upload directly to R2 using PUT
   */
  const uploadFileConnectR2 = async (
    file: File,
    type: "video" | "thumbnail",
    onProgress: (progress: number) => void,
  ): Promise<{ url: string; key: string; size: number; type: string }> => {
    // 1. Get Presigned URL
    const initRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        type,
      }),
    })

    if (!initRes.ok) {
      const error = await initRes.json()
      throw new Error(error.error || "Failed to get upload URL")
    }

    const { uploadUrl, key } = await initRes.json()

    // 2. Upload to R2 (Directly)
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("PUT", uploadUrl)
      xhr.setRequestHeader("Content-Type", file.type)

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return
        const progress = Math.round((event.loaded / event.total) * 100)
        onProgress(progress)
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Construct the public URL correctly
          // We know the key, and we can construct the URL based on R2 public domain
          // BUT, for now our API returns the full 'uploadUrl' which is signed.
          // We need the PUBLIC url to save to DB.
          // The API didn't return the public URL, only key.
          // Let's assume standard R2 public domain structure or ask API to return it?
          // Actually, our API /upload returns `key`.
          // We can construct the URL if we know the domain. 
          // However, for simplicity, let's update strict `videoUrl` construction.
          // In this specific app, `key` is enough if we have a robust URL builder, 
          // but our DB saves full URL.
          // Let's updated `uploadToR2` in previous step? No, we used signed url.
          // We need the PUBLIC_DOMAIN.
          // Quick fix: We will rely on the `key` and constructing it, 
          // OR better: Assume the `uploadUrl` is NOT the public URL.
          // We need to construct: `https://<R2_PUBLIC_DOMAIN>/<key>`
          // Since we are client side, we might not know R2_PUBLIC_DOMAIN easily.
          // Let's use a relative path or ask the User to Config it?
          // No, better approach: The API should return the `publicUrl` as well.
          // I will update the API to return `publicUrl` in the next step if needed.
          // For now, let's assume we pass the `key` to the `create video` API 
          // and let the backend construct the final URL. This is safer.
          // Wait, `app/api/videos/route.ts` expects `videoUrl` string.
          // Let's modify `app/api/videos/route.ts` OR just assume a domain.
          // Actually, the previous implementation returned `url` (public).
          // Let's modify the frontend to send `key` instead of `url` and let backend handle it?
          // No, to minimize changes, let's just make the API return `publicUrl`.
          // I'll update the API first then come back here.
          // Wait, I can't interrupt this tool call sequence easily to go back.
          // I will Implement this function to return `key`, and then
          // in `handleSubmit`, I will send `key` to the backend.
          // And I will Update `app/api/videos/route.ts` to accept `videoKey` OR `videoUrl`.
          // That seems robust.
          resolve({ url: key, key, size: file.size, type: file.type })
        } else {
          reject(new Error("Upload to R2 failed"))
        }
      }

      xhr.onerror = () => reject(new Error("Network error during upload"))
      xhr.send(file)
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}

    if (!title.trim()) {
      nextErrors.title = "Title is required"
    }
    if (!videoFile) {
      nextErrors.videoFile = "Video file is required"
    }
    if (visibility === "DOMAIN_RESTRICTED" && allowedDomainIds.length === 0) {
      nextErrors.allowedDomainIds = "Select at least one allowed domain"
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setLoading(true)
    setUploadStatus("Starting upload...")
    setUploadProgress(0)

    try {
      // 1. Upload Video
      setUploadStatus("Uploading video directly to R2...")
      // We'll use the returned 'url' as the 'key' for now, and handle logic below
      const videoUpload = await uploadFileConnectR2(videoFile!, "video", setUploadProgress)

      let thumbnailKey: string | undefined

      // 2. Upload Thumbnail (Optional)
      if (thumbnailFile) {
        setUploadStatus("Uploading thumbnail...")
        setUploadProgress(0)
        const thumbnailUpload = await uploadFileConnectR2(thumbnailFile, "thumbnail", setUploadProgress)
        thumbnailKey = thumbnailUpload.key
      }

      // 3. Save to Database
      // Note: We are sending 'key' instead of full URL. 
      // The backend /api/videos needs to be smart enough or we update it.
      // Let's verify /api/videos/route.ts behavior.
      // If it blindly saves the string, then `videoUrl` will be just the path.
      // e.g., "videos/123-abc.mp4".
      // Then `video-player.tsx` needs to know the domain.
      // OR we update /api/videos to prepend the domain.
      // Let's assume we will update /api/videos to handle this.

      setUploadStatus("Saving video details...")
      const response = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          categoryId: categoryId === "none" ? undefined : categoryId,
          visibility,
          allowedDomainIds: visibility === "DOMAIN_RESTRICTED" ? allowedDomainIds : undefined,
          videoKey: videoUpload.key, // New field, or reuse videoUrl? reusing videoUrl is cleaner if we fix it in backend
          videoUrl: videoUpload.key, // Passing Key as URL for now, Backend MUST fix this.
          thumbnailUrl: thumbnailKey,
          fileSize: videoUpload.size,
          mimeType: videoUpload.type,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Failed to create video")
      }

      toast.success("Video created successfully")
      router.push(`/videos/${result.video.id}`)
      router.refresh()
    } catch (error) {
      console.error(error)
      const message = error instanceof Error ? error.message : "Upload failed"
      toast.error(message)
    } finally {
      setLoading(false)
      setUploadStatus("")
      setUploadProgress(0)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/videos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Videos
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-2xl">เพิ่มวิดีโอ</CardTitle>
              <CardDescription>กรอกข้อมูลเกี่ยวกับวิดีโอ ไลฟ์วิดีโอและรูปหน้าปก.</CardDescription>
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
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>หมวดหมู่</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกหมวดหมู่" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>เผยแพร่</Label>
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
                </div>

                {visibility === "DOMAIN_RESTRICTED" && (
                  <div className="space-y-2">
                    <Label>Domains ที่อนุญาต</Label>
                    {activeDomains.length === 0 ? (
                      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        ไม่มี Domains ที่ใช้งานอยู่ เพิ่ม Domains ใน{" "}
                        <Link href="/settings/domains" className="text-primary underline">
                          การตั้งค่าโดเมน
                        </Link>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {activeDomains.map((domain) => (
                          <label
                            key={domain.id}
                            className="flex items-center gap-2 rounded-md border p-3 text-sm"
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
                  <Label htmlFor="video-file">ไฟล์วิดีโอ</Label>
                  <Input
                    id="video-file"
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                    onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
                  />
                  {videoFile && <p className="text-sm text-muted-foreground">{videoFile.name}</p>}
                  {errors.videoFile && <p className="text-sm text-destructive">{errors.videoFile}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnail-file">รูปหน้าปก (optional)</Label>
                  <Input
                    id="thumbnail-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setThumbnailFile(event.target.files?.[0] ?? null)}
                  />
                  {thumbnailFile && <p className="text-sm text-muted-foreground">{thumbnailFile.name}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={loading}>
                    <UploadCloud className="h-4 w-4 mr-2" />
                    {loading ? "Uploading..." : "Upload Video"}
                  </Button>
                  {uploadStatus && <span className="text-sm text-muted-foreground">{uploadStatus}</span>}
                </div>
                {loading && uploadStatus.includes("Uploading") && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} />
                    <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ข้อแนะนำในการอัปโหลด</CardTitle>
                <CardDescription>รายละเอียดการอัปโหลดไฟล์วิดีโอและรูปภาพหน้าปกคลิป</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>ขนาดไฟล์สูงสุด : 5GB</p>
                <p>รองรับไฟล์ : MP4, WebM, MOV, AVI</p>
                <p>ชนิดรูปหน้าปก : JPG, PNG, WebP</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>การมองเห็น</CardTitle>
                <CardDescription>ควบคุมผู้ที่สามารถเข้าถึงวิดีโอได้</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  วิดีโอสาธารณะจะปรากฏให้ทุกคนเห็น วิดีโอส่วนตัวจะมองเห็นได้เฉพาะคุณและผู้ดูแลระบบ.
                </p>
                <p>วิดีโอที่จำกัดโดเมนสามารถฝังได้เฉพาะบนโดเมนที่อนุมัติเท่านั้น</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
