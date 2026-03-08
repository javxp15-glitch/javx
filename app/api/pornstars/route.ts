import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createPornstarSchema, pornstarQuerySchema } from "@/lib/validation"
import { generateSlug, calculateAge } from "@/lib/utils"

// GET - List pornstars with filters
export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request)
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const query = Object.fromEntries(searchParams.entries())
        const validatedQuery = pornstarQuerySchema.parse(query)

        // Build where clause
        const where: any = {}

        // Search by name
        if (validatedQuery.search) {
            where.OR = [
                { name: { contains: validatedQuery.search, mode: "insensitive" } },
                { nameJp: { contains: validatedQuery.search, mode: "insensitive" } },
            ]
        }

        // Filter by height
        if (validatedQuery.minHeight || validatedQuery.maxHeight) {
            where.height = {}
            if (validatedQuery.minHeight) where.height.gte = validatedQuery.minHeight
            if (validatedQuery.maxHeight) where.height.lte = validatedQuery.maxHeight
        }

        // Filter by cup size
        if (validatedQuery.cupSize) {
            where.cupSize = validatedQuery.cupSize
        }

        // Filter by age (calculated from birthday)
        if (validatedQuery.minAge || validatedQuery.maxAge) {
            const today = new Date()
            if (validatedQuery.maxAge) {
                const minBirthday = new Date(today.getFullYear() - validatedQuery.maxAge - 1, today.getMonth(), today.getDate())
                where.birthday = { ...where.birthday, gte: minBirthday }
            }
            if (validatedQuery.minAge) {
                const maxBirthday = new Date(today.getFullYear() - validatedQuery.minAge, today.getMonth(), today.getDate())
                where.birthday = { ...where.birthday, lte: maxBirthday }
            }
        }

        // Filter by debut year
        if (validatedQuery.minDebutYear || validatedQuery.maxDebutYear) {
            where.debutYear = {}
            if (validatedQuery.minDebutYear) where.debutYear.gte = validatedQuery.minDebutYear
            if (validatedQuery.maxDebutYear) where.debutYear.lte = validatedQuery.maxDebutYear
        }

        // Sorting
        let orderBy: any = {}
        if (validatedQuery.sort === "name") {
            orderBy.name = "asc"
        } else if (validatedQuery.sort === "videos") {
            orderBy.videos = { _count: "desc" }
        } else if (validatedQuery.sort === "newest") {
            orderBy.createdAt = "desc"
        } else if (validatedQuery.sort === "debut") {
            orderBy.debutYear = "desc"
        }

        // Pagination
        const skip = (validatedQuery.page - 1) * validatedQuery.limit
        const take = validatedQuery.limit

        // Execute query
        const [pornstars, total] = await Promise.all([
            prisma.pornstar.findMany({
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
            prisma.pornstar.count({ where }),
        ])

        // Transform response to include age and video count
        const transformedPornstars = pornstars.map((p) => ({
            id: p.id,
            name: p.name,
            nameJp: p.nameJp,
            slug: p.slug,
            avatar: p.avatar,
            height: p.height,
            cupSize: p.cupSize,
            bust: p.bust,
            waist: p.waist,
            hip: p.hip,
            birthday: p.birthday,
            age: calculateAge(p.birthday),
            debutYear: p.debutYear,
            nationality: p.nationality,
            bio: p.bio,
            videoCount: p._count.videos,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        }))

        return NextResponse.json({
            pornstars: transformedPornstars,
            pagination: {
                page: validatedQuery.page,
                limit: validatedQuery.limit,
                total,
                totalPages: Math.ceil(total / validatedQuery.limit),
            },
        })
    } catch (error) {
        console.error("List pornstars error:", error)
        return NextResponse.json({ error: "Failed to fetch pornstars" }, { status: 500 })
    }
}

// POST - Create new pornstar
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
        const validatedData = createPornstarSchema.parse(body)

        // Generate slug if not provided
        const slug = validatedData.slug || generateSlug(validatedData.name)

        // Check if slug already exists
        const existingPornstar = await prisma.pornstar.findUnique({
            where: { slug },
        })

        if (existingPornstar) {
            return NextResponse.json({ error: "Pornstar with this slug already exists" }, { status: 409 })
        }

        // Create pornstar
        const pornstar = await prisma.pornstar.create({
            data: {
                name: validatedData.name,
                nameJp: validatedData.nameJp,
                slug,
                avatar: validatedData.avatar,
                height: validatedData.height,
                cupSize: validatedData.cupSize,
                bust: validatedData.bust,
                waist: validatedData.waist,
                hip: validatedData.hip,
                birthday: validatedData.birthday,
                debutYear: validatedData.debutYear,
                nationality: validatedData.nationality,
                bio: validatedData.bio,
            },
        })

        return NextResponse.json(
            {
                message: "Pornstar created successfully",
                pornstar: {
                    ...pornstar,
                    age: calculateAge(pornstar.birthday),
                    videoCount: 0,
                },
            },
            { status: 201 }
        )
    } catch (error) {
        console.error("Create pornstar error:", error)
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ error: "Failed to create pornstar" }, { status: 500 })
    }
}
