import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updatePornstarSchema } from "@/lib/validation"
import { generateSlug, calculateAge } from "@/lib/utils"

// GET - Get pornstar by ID
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    try {
        const user = await getUserFromRequest(request)
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const pornstar = await prisma.pornstar.findUnique({
            where: { id: params.id },
            include: {
                videos: {
                    include: {
                        video: {
                            select: {
                                id: true,
                                title: true,
                                slug: true,
                                thumbnailUrl: true,
                                duration: true,
                                views: true,
                                status: true,
                                createdAt: true,
                            },
                        },
                    },
                    orderBy: {
                        video: { createdAt: "desc" },
                    },
                },
                _count: {
                    select: { videos: true },
                },
            },
        })

        if (!pornstar) {
            return NextResponse.json({ error: "Pornstar not found" }, { status: 404 })
        }

        // Transform response
        const transformedPornstar = {
            id: pornstar.id,
            name: pornstar.name,
            nameJp: pornstar.nameJp,
            slug: pornstar.slug,
            avatar: pornstar.avatar,
            height: pornstar.height,
            cupSize: pornstar.cupSize,
            bust: pornstar.bust,
            waist: pornstar.waist,
            hip: pornstar.hip,
            birthday: pornstar.birthday,
            age: calculateAge(pornstar.birthday),
            debutYear: pornstar.debutYear,
            nationality: pornstar.nationality,
            bio: pornstar.bio,
            videoCount: pornstar._count.videos,
            videos: pornstar.videos.map((v) => v.video),
            createdAt: pornstar.createdAt,
            updatedAt: pornstar.updatedAt,
        }

        return NextResponse.json({ pornstar: transformedPornstar })
    } catch (error) {
        console.error("Get pornstar error:", error)
        return NextResponse.json({ error: "Failed to fetch pornstar" }, { status: 500 })
    }
}

// PUT - Update pornstar
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

        const existingPornstar = await prisma.pornstar.findUnique({
            where: { id: params.id },
        })

        if (!existingPornstar) {
            return NextResponse.json({ error: "Pornstar not found" }, { status: 404 })
        }

        const body = await request.json()
        const validatedData = updatePornstarSchema.parse(body)

        // If name is updated and no new slug provided, regenerate slug
        let slug = validatedData.slug
        if (validatedData.name && !validatedData.slug) {
            slug = generateSlug(validatedData.name)
        }

        // Check if new slug conflicts with existing one
        if (slug && slug !== existingPornstar.slug) {
            const conflictingPornstar = await prisma.pornstar.findUnique({
                where: { slug },
            })
            if (conflictingPornstar) {
                return NextResponse.json({ error: "Pornstar with this slug already exists" }, { status: 409 })
            }
        }

        const updatedPornstar = await prisma.pornstar.update({
            where: { id: params.id },
            data: {
                ...(validatedData.name && { name: validatedData.name }),
                ...(validatedData.nameJp !== undefined && { nameJp: validatedData.nameJp }),
                ...(slug && { slug }),
                ...(validatedData.avatar !== undefined && { avatar: validatedData.avatar }),
                ...(validatedData.height !== undefined && { height: validatedData.height }),
                ...(validatedData.cupSize !== undefined && { cupSize: validatedData.cupSize }),
                ...(validatedData.bust !== undefined && { bust: validatedData.bust }),
                ...(validatedData.waist !== undefined && { waist: validatedData.waist }),
                ...(validatedData.hip !== undefined && { hip: validatedData.hip }),
                ...(validatedData.birthday !== undefined && { birthday: validatedData.birthday }),
                ...(validatedData.debutYear !== undefined && { debutYear: validatedData.debutYear }),
                ...(validatedData.nationality !== undefined && { nationality: validatedData.nationality }),
                ...(validatedData.bio !== undefined && { bio: validatedData.bio }),
            },
            include: {
                _count: {
                    select: { videos: true },
                },
            },
        })

        return NextResponse.json({
            message: "Pornstar updated successfully",
            pornstar: {
                ...updatedPornstar,
                age: calculateAge(updatedPornstar.birthday),
                videoCount: updatedPornstar._count.videos,
            },
        })
    } catch (error) {
        console.error("Update pornstar error:", error)
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ error: "Failed to update pornstar" }, { status: 500 })
    }
}

// DELETE - Delete pornstar
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    try {
        const user = await getUserFromRequest(request)
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden - Only admin can delete pornstars" }, { status: 403 })
        }

        const pornstar = await prisma.pornstar.findUnique({
            where: { id: params.id },
        })

        if (!pornstar) {
            return NextResponse.json({ error: "Pornstar not found" }, { status: 404 })
        }

        // Delete pornstar (cascade will handle video relations)
        await prisma.pornstar.delete({
            where: { id: params.id },
        })

        return NextResponse.json({
            message: "Pornstar deleted successfully",
        })
    } catch (error) {
        console.error("Delete pornstar error:", error)
        return NextResponse.json({ error: "Failed to delete pornstar" }, { status: 500 })
    }
}
