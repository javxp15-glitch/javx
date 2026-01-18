import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSignedPlaybackUrl, normalizeR2Url, toPublicPlaybackUrl, deleteFromR2 } from "@/lib/r2"
import { updateVideoSchema } from "@/lib/validation"
import { generateUniqueSlug } from "@/lib/utils"

const mapPluginVideo = (video: {
  id: string
  title: string
  slug: string
  description: string | null
  videoUrl: string
  thumbnailUrl: string | null
  duration: number | null
  createdAt: Date
  updatedAt: Date
  categories?: { category: { name: string } }[]
  pornstars?: { pornstar: { name: string; slug: string } }[]
  tags?: { tag: { name: string; slug: string } }[]
}) => ({
  id: video.id,
  title: video.title,
  slug: video.slug,
  description: video.description ?? "",
  video_url: normalizeR2Url(video.videoUrl),
  playback_url: toPublicPlaybackUrl(video.videoUrl) ?? normalizeR2Url(video.videoUrl),
  thumbnail_url: normalizeR2Url(video.thumbnailUrl),
  duration: video.duration,
  categories: video.categories?.map((c) => c.category.name) || [],
  pornstars: video.pornstars?.map((p) => ({ name: p.pornstar.name, slug: p.pornstar.slug })) || [],
  tags: video.tags?.map((t) => t.tag.name) || [],
  created_at: video.createdAt,
  updated_at: video.updatedAt,
})

// GET - Get video by ID
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const video = await prisma.video.findUnique({
      where: { id: params.id },
      include: {
        categories: { include: { category: true } },
        pornstars: { include: { pornstar: true } },
        tags: { include: { tag: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        allowedDomains: { include: { domain: true } },
      },
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Check access permissions
    if (video.visibility === "PRIVATE" && video.createdById !== user.userId && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Increment view count (fire-and-forget)
    prisma.video.update({
      where: { id: params.id },
      data: { views: { increment: 1 } },
    }).catch(console.error)

    const userAgent = request.headers.get("user-agent") ?? ""
    const isPluginRequest = Boolean(request.headers.get("authorization")) || userAgent.includes("7LS-Video-Publisher")
    const resolvedVideoUrl = await getSignedPlaybackUrl(video.videoUrl)

    const normalizedVideo = {
      ...video,
      videoUrl: resolvedVideoUrl ?? normalizeR2Url(video.videoUrl) ?? video.videoUrl,
      thumbnailUrl: normalizeR2Url(video.thumbnailUrl),
    }

    if (isPluginRequest) {
      const cleanUrl = normalizedVideo.videoUrl.split("?")[0].toLowerCase()
      const isMp4 = video.mimeType?.toLowerCase() === "video/mp4" || cleanUrl.endsWith(".mp4")
      if (!isMp4) {
        return NextResponse.json({ error: "Video is still processing" }, { status: 409 })
      }
      return NextResponse.json({ data: mapPluginVideo(normalizedVideo) })
    }

    return NextResponse.json({ video: normalizedVideo })
  } catch (error) {
    console.error("Get video error:", error)
    return NextResponse.json({ error: "Failed to fetch video" }, { status: 500 })
  }
}

// PUT - Update video
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["ADMIN", "EDITOR"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const video = await prisma.video.findUnique({
      where: { id: params.id },
      include: {
        tags: { select: { tagId: true } },
      },
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    if (video.createdById !== user.userId && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateVideoSchema.parse(body)

    // Update video
    const updatedVideo = await prisma.video.update({
      where: { id: params.id },
      data: {
        ...(validatedData.title && { title: validatedData.title }),
        ...(validatedData.slug && { slug: validatedData.slug }),
        ...(validatedData.title && !validatedData.slug && { slug: generateUniqueSlug(validatedData.title) }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.visibility && { visibility: validatedData.visibility }),
        ...(validatedData.status && { status: validatedData.status }),
      },
    })

    // Update category relations
    if (validatedData.categoryIds !== undefined) {
      await prisma.videoCategory.deleteMany({ where: { videoId: params.id } })
      if (validatedData.categoryIds.length > 0) {
        await prisma.videoCategory.createMany({
          data: validatedData.categoryIds.map((categoryId) => ({
            videoId: params.id,
            categoryId,
          })),
        })
      }
    }

    // Update pornstar relations
    if (validatedData.pornstarIds !== undefined) {
      await prisma.videoPornstar.deleteMany({ where: { videoId: params.id } })
      if (validatedData.pornstarIds.length > 0) {
        await prisma.videoPornstar.createMany({
          data: validatedData.pornstarIds.map((pornstarId) => ({
            videoId: params.id,
            pornstarId,
          })),
        })
      }
    }

    // Update tag relations and usage counts
    if (validatedData.tagIds !== undefined) {
      const oldTagIds = video.tags.map((t) => t.tagId)
      const newTagIds = validatedData.tagIds

      // Decrement usage for removed tags
      const removedTagIds = oldTagIds.filter((id) => !newTagIds.includes(id))
      if (removedTagIds.length > 0) {
        await prisma.tag.updateMany({
          where: { id: { in: removedTagIds } },
          data: { usage: { decrement: 1 } },
        })
      }

      // Increment usage for new tags
      const addedTagIds = newTagIds.filter((id) => !oldTagIds.includes(id))
      if (addedTagIds.length > 0) {
        await prisma.tag.updateMany({
          where: { id: { in: addedTagIds } },
          data: { usage: { increment: 1 } },
        })
      }

      await prisma.videoTag.deleteMany({ where: { videoId: params.id } })
      if (newTagIds.length > 0) {
        await prisma.videoTag.createMany({
          data: newTagIds.map((tagId) => ({ videoId: params.id, tagId })),
        })
      }
    }

    // Update allowed domains
    if (validatedData.visibility === "DOMAIN_RESTRICTED" && validatedData.allowedDomainIds) {
      await prisma.videoAllowedDomain.deleteMany({ where: { videoId: params.id } })
      await Promise.all(
        validatedData.allowedDomainIds.map((domainId) =>
          prisma.videoAllowedDomain.create({ data: { videoId: params.id, domainId } })
        )
      )
    }

    // Fetch updated video with relations
    const finalVideo = await prisma.video.findUnique({
      where: { id: params.id },
      include: {
        categories: { include: { category: true } },
        pornstars: { include: { pornstar: true } },
        tags: { include: { tag: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ message: "Video updated successfully", video: finalVideo })
  } catch (error) {
    console.error("Update video error:", error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update video" }, { status: 500 })
  }
}

// DELETE - Delete video
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Only admin can delete videos" }, { status: 403 })
    }

    const video = await prisma.video.findUnique({
      where: { id: params.id },
      include: { tags: { select: { tagId: true } } },
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Decrement tag usage for all tags
    const tagIds = video.tags.map((t) => t.tagId)
    if (tagIds.length > 0) {
      await prisma.tag.updateMany({
        where: { id: { in: tagIds } },
        data: { usage: { decrement: 1 } },
      })
    }

    // Delete files from R2
    try {
      const videoKey = video.videoUrl.split("/").pop()
      if (videoKey) await deleteFromR2(videoKey)

      if (video.thumbnailUrl) {
        const thumbnailKey = video.thumbnailUrl.split("/").pop()
        if (thumbnailKey) await deleteFromR2(thumbnailKey)
      }

      if (video.previewUrl) {
        const previewKey = video.previewUrl.split("/").pop()
        if (previewKey) await deleteFromR2(previewKey)
      }
    } catch (error) {
      console.error("Failed to delete files from R2:", error)
    }

    // Delete video (cascade will handle relations)
    await prisma.video.delete({ where: { id: params.id } })

    return NextResponse.json({ message: "Video deleted successfully" })
  } catch (error) {
    console.error("Delete video error:", error)
    return NextResponse.json({ error: "Failed to delete video" }, { status: 500 })
  }
}
