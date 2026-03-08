"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, UploadCloud, Film, ImagePlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MultiCategorySelector } from "@/components/multi-category-selector"
import { MultiPornstarSelector } from "@/components/multi-pornstar-selector"
import { MultiTagSelector } from "@/components/multi-tag-selector"

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
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [pornstarIds, setPornstarIds] = useState<string[]>([])
  const [tagIds, setTagIds] = useState<string[]>([])
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC")
  const [allowedDomainIds, setAllowedDomainIds] = useState<string[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [videoDuration, setVideoDuration] = useState<number | null>(null)

  // Extract video duration when file is selected
  const handleVideoFileChange = (file: File | null) => {
    setVideoFile(file)
    setVideoDuration(null)

    if (file) {
      const video = document.createElement("video")
      video.preload = "metadata"
      video.onloadedmetadata = () => {
        setVideoDuration(Math.round(video.duration))
        URL.revokeObjectURL(video.src)
      }
      video.src = URL.createObjectURL(file)
    }
  }

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
          categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
          pornstarIds: pornstarIds.length > 0 ? pornstarIds : undefined,
          tagIds: tagIds.length > 0 ? tagIds : undefined,
          visibility,
          allowedDomainIds: visibility === "DOMAIN_RESTRICTED" ? allowedDomainIds : undefined,
          videoKey: videoUpload.key,
          videoUrl: videoUpload.key,
          thumbnailUrl: thumbnailKey,
          fileSize: videoUpload.size,
          mimeType: videoUpload.type,
          duration: videoDuration,
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
    <div className="min-h-screen bg-background relative">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-24 relative z-10">
        <Button variant="ghost" asChild className="mb-6 text-muted-foreground hover:text-white">
          <Link href="/videos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับไปหน้าวิดีโอ
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 flex items-center gap-2">
                <UploadCloud className="h-6 w-6 text-primary" />
                เพิ่มวิดีโอ
              </h1>
              <p className="text-muted-foreground text-sm mt-1">กรอกข้อมูลเกี่ยวกับวิดีโอ ไลฟ์วิดีโอและรูปหน้าปก</p>
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
                  className="bg-white/5 border-white/10 focus:border-primary/50"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-gray-300">หมวดหมู่</Label>
                  <MultiCategorySelector value={categoryIds} onValueChange={setCategoryIds} />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">เผยแพร่</Label>
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-gray-300">Pornstars</Label>
                  <MultiPornstarSelector value={pornstarIds} onValueChange={setPornstarIds} />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Tags</Label>
                  <MultiTagSelector value={tagIds} onValueChange={setTagIds} />
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
                <Label className="text-gray-300">ไฟล์วิดีโอ</Label>
                <label
                  htmlFor="video-file"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Film className="w-8 h-8 mb-2 text-primary" />
                    <p className="mb-1 text-sm text-white font-medium">
                      {videoFile ? videoFile.name : "คลิกเพื่อเลือกไฟล์วิดีโอ"}
                    </p>
                    <p className="text-xs text-muted-foreground">MP4, WebM, MOV, AVI (สูงสุด 5GB)</p>
                  </div>
                  <input
                    id="video-file"
                    type="file"
                    className="hidden"
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                    onChange={(event) => handleVideoFileChange(event.target.files?.[0] ?? null)}
                  />
                </label>
                {errors.videoFile && <p className="text-sm text-destructive">{errors.videoFile}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">รูปหน้าปก (ไม่บังคับ)</Label>
                <label
                  htmlFor="thumbnail-file"
                  className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/20 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all"
                >
                  <div className="flex flex-col items-center justify-center">
                    <ImagePlus className="w-6 h-6 mb-1 text-accent" />
                    <p className="text-sm text-white font-medium">
                      {thumbnailFile ? thumbnailFile.name : "เลือกรูปหน้าปก"}
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

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  <UploadCloud className="h-4 w-4 mr-2" />
                  {loading ? "กำลังอัปโหลด..." : "อัปโหลดวิดีโอ"}
                </Button>
                {uploadStatus && <span className="text-sm text-muted-foreground">{uploadStatus}</span>}
              </div>
              {loading && uploadStatus.includes("Uploading") && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="bg-white/10" />
                  <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
                </div>
              )}
            </form>
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-2">ข้อแนะนำในการอัปโหลด</h3>
              <p className="text-muted-foreground text-sm mb-3">รายละเอียดการอัปโหลดไฟล์วิดีโอ</p>
              <div className="space-y-2 text-sm text-gray-400">
                <p>• ขนาดไฟล์สูงสุด : 5GB</p>
                <p>• รองรับไฟล์ : MP4, WebM, MOV, AVI</p>
                <p>• ชนิดรูปหน้าปก : JPG, PNG, WebP</p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-2">การมองเห็น</h3>
              <p className="text-muted-foreground text-sm mb-3">ควบคุมผู้ที่สามารถเข้าถึงวิดีโอได้</p>
              <div className="space-y-2 text-sm text-gray-400">
                <p>• วิดีโอสาธารณะจะปรากฏให้ทุกคนเห็น</p>
                <p>• วิดีโอส่วนตัวจะมองเห็นได้เฉพาะคุณและผู้ดูแลระบบ</p>
                <p>• วิดีโอที่จำกัดโดเมนสามารถฝังได้เฉพาะบนโดเมนที่อนุมัติ</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
