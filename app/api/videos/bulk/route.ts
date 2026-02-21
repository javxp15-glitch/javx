import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateSlug, generateUniqueSlug } from "@/lib/utils"
import { enqueueVideoTranscode } from "@/lib/video-transcode"

const bulkCreateVideoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  videoUrl: z.string().min(1, "Video URL is required"),
  categoryNames: z.array(z.string()).optional().default([]),
  tagNames: z.array(z.string()).optional().default([]),
  visibility: z
    .enum(["PUBLIC", "PRIVATE", "DOMAIN_RESTRICTED"])
    .default("PUBLIC"),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
})

async function resolveCategories(names: string[]): Promise<string[]> {
  if (!names.length) return []

  const ids: string[] = []

  for (const rawName of names) {
    const name = rawName.trim()
    if (!name) continue

    let category = await prisma.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    })

    if (!category) {
      const slug = generateSlug(name)
      category = await prisma.category.create({
        data: { name, slug },
      })
    }

    ids.push(category.id)
  }

  return ids
}

async function resolveTags(names: string[]): Promise<string[]> {
  if (!names.length) return []

  const ids: string[] = []

  for (const rawName of names) {
    const name = rawName.trim()
    if (!name) continue

    let tag = await prisma.tag.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    })

    if (!tag) {
      const slug = generateSlug(name)
      tag = await prisma.tag.create({
        data: { name, slug },
      })
    }

    ids.push(tag.id)
  }

  return ids
}

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
    const validatedData = bulkCreateVideoSchema.parse(body)

    const categoryIds = await resolveCategories(validatedData.categoryNames)
    const tagIds = await resolveTags(validatedData.tagNames)

    const slug = generateUniqueSlug(validatedData.title)

    const video = await prisma.video.create({
      data: {
        title: validatedData.title,
        slug,
        description: validatedData.description,
        videoUrl: validatedData.videoUrl,
        fileSize: validatedData.fileSize,
        mimeType: validatedData.mimeType,
        visibility: validatedData.visibility,
        status: "READY",
        createdById: user.userId,
        ...(categoryIds.length > 0 && {
          categories: {
            create: categoryIds.map((categoryId) => ({ categoryId })),
          },
        }),
        ...(tagIds.length > 0 && {
          tags: {
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (tagIds.length > 0) {
      await prisma.tag.updateMany({
        where: { id: { in: tagIds } },
        data: { usage: { increment: 1 } },
      })
    }

    enqueueVideoTranscode(video.id, video.videoUrl, video.mimeType)

    return NextResponse.json(
      { message: "Video created successfully", video },
      { status: 201 },
    )
  } catch (error) {
    console.error("Bulk create video error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map((e) => e.message).join(", ") },
        { status: 400 },
      )
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to create video" },
      { status: 500 },
    )
  }
}
