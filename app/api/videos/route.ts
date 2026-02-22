import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createVideoSchema } from "@/lib/validation"
import { enqueueThumbnailGenerate, enqueueVideoTranscode } from "@/lib/video-transcode"
import { generateUniqueSlug } from "@/lib/utils"

// POST - Create new video
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["ADMIN", "EDITOR"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createVideoSchema.parse(body)

    // Generate slug if not provided
    const slug = validatedData.slug || generateUniqueSlug(validatedData.title)

    // Create video with relations
    const video = await prisma.video.create({
      data: {
        title: validatedData.title,
        slug,
        description: validatedData.description,
        videoUrl: body.videoUrl,
        thumbnailUrl: body.thumbnailUrl,
        previewUrl: body.previewUrl,
        duration: body.duration,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        visibility: validatedData.visibility,
        status: "READY",
        createdById: user.userId,
        // Create category relations
        ...(validatedData.categoryIds && validatedData.categoryIds.length > 0 && {
          categories: {
            create: validatedData.categoryIds.map((categoryId) => ({
              categoryId,
            })),
          },
        }),
        // Create pornstar relations
        ...(validatedData.pornstarIds && validatedData.pornstarIds.length > 0 && {
          pornstars: {
            create: validatedData.pornstarIds.map((pornstarId) => ({
              pornstarId,
            })),
          },
        }),
        // Create tag relations
        ...(validatedData.tagIds && validatedData.tagIds.length > 0 && {
          tags: {
            create: validatedData.tagIds.map((tagId) => ({
              tagId,
            })),
          },
        }),
      },
      include: {
        categories: { include: { category: true } },
        pornstars: { include: { pornstar: true } },
        tags: { include: { tag: true } },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // Add allowed domains if visibility is DOMAIN_RESTRICTED
    if (validatedData.visibility === "DOMAIN_RESTRICTED" && validatedData.allowedDomainIds) {
      await Promise.all(
        validatedData.allowedDomainIds.map((domainId) =>
          prisma.videoAllowedDomain.create({
            data: { videoId: video.id, domainId },
          })
        )
      )
    }

    // Update tag usage counts
    if (validatedData.tagIds && validatedData.tagIds.length > 0) {
      await prisma.tag.updateMany({
        where: { id: { in: validatedData.tagIds } },
        data: { usage: { increment: 1 } },
      })
    }

    enqueueVideoTranscode(video.id, video.videoUrl, video.mimeType)
    if (!body.thumbnailUrl) {
      enqueueThumbnailGenerate(video.id)
    }

    return NextResponse.json(
      { message: "Video created successfully", video },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create video error:", error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create video" }, { status: 500 })
  }
}

