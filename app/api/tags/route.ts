import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createTagSchema, tagQuerySchema } from "@/lib/validation"
import { generateSlug } from "@/lib/utils"

// GET - List tags
export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request)
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const query = Object.fromEntries(searchParams.entries())
        const validatedQuery = tagQuerySchema.parse(query)

        // Build where clause
        const where: any = {}

        // Search by name
        if (validatedQuery.search) {
            where.name = { contains: validatedQuery.search, mode: "insensitive" }
        }

        // Sorting
        let orderBy: any = {}
        if (validatedQuery.sort === "name") {
            orderBy.name = "asc"
        } else if (validatedQuery.sort === "usage") {
            orderBy.usage = "desc"
        } else if (validatedQuery.sort === "newest") {
            orderBy.createdAt = "desc"
        }

        // Pagination
        const skip = (validatedQuery.page - 1) * validatedQuery.limit
        const take = validatedQuery.limit

        // Execute query
        const [tags, total] = await Promise.all([
            prisma.tag.findMany({
                where,
                orderBy,
                skip,
                take,
                include: {
                    _count: {
                        select: { videos: true },
                    },
                },
            }),
            prisma.tag.count({ where }),
        ])

        // Transform response
        const transformedTags = tags.map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            usage: t.usage,
            videoCount: t._count.videos,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        }))

        return NextResponse.json({
            tags: transformedTags,
            pagination: {
                page: validatedQuery.page,
                limit: validatedQuery.limit,
                total,
                totalPages: Math.ceil(total / validatedQuery.limit),
            },
        })
    } catch (error) {
        console.error("List tags error:", error)
        return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 })
    }
}

// POST - Create new tag
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
        const validatedData = createTagSchema.parse(body)

        // Generate slug if not provided
        const slug = validatedData.slug || generateSlug(validatedData.name)

        // Check if tag already exists
        const existingTag = await prisma.tag.findFirst({
            where: {
                OR: [{ name: validatedData.name }, { slug }],
            },
        })

        if (existingTag) {
            return NextResponse.json({ error: "Tag already exists" }, { status: 409 })
        }

        // Create tag
        const tag = await prisma.tag.create({
            data: {
                name: validatedData.name,
                slug,
            },
        })

        return NextResponse.json(
            {
                message: "Tag created successfully",
                tag: {
                    ...tag,
                    videoCount: 0,
                },
            },
            { status: 201 }
        )
    } catch (error) {
        console.error("Create tag error:", error)
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ error: "Failed to create tag" }, { status: 500 })
    }
}
