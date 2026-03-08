import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateTagSchema } from "@/lib/validation"
import { generateSlug } from "@/lib/utils"

// GET - Get tag by ID
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    try {
        const user = await getUserFromRequest(request)
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const tag = await prisma.tag.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: { videos: true },
                },
            },
        })

        if (!tag) {
            return NextResponse.json({ error: "Tag not found" }, { status: 404 })
        }

        return NextResponse.json({
            tag: {
                ...tag,
                videoCount: tag._count.videos,
            },
        })
    } catch (error) {
        console.error("Get tag error:", error)
        return NextResponse.json({ error: "Failed to fetch tag" }, { status: 500 })
    }
}

// PUT - Update tag
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

        const existingTag = await prisma.tag.findUnique({
            where: { id: params.id },
        })

        if (!existingTag) {
            return NextResponse.json({ error: "Tag not found" }, { status: 404 })
        }

        const body = await request.json()
        const validatedData = updateTagSchema.parse(body)

        // Check for conflicts
        if (validatedData.name || validatedData.slug) {
            const conflictingTag = await prisma.tag.findFirst({
                where: {
                    id: { not: params.id },
                    OR: [
                        ...(validatedData.name ? [{ name: validatedData.name }] : []),
                        ...(validatedData.slug ? [{ slug: validatedData.slug }] : []),
                    ],
                },
            })
            if (conflictingTag) {
                return NextResponse.json({ error: "Tag with this name or slug already exists" }, { status: 409 })
            }
        }

        const updatedTag = await prisma.tag.update({
            where: { id: params.id },
            data: {
                ...(validatedData.name && { name: validatedData.name }),
                ...(validatedData.slug && { slug: validatedData.slug }),
                ...(validatedData.name && !validatedData.slug && { slug: generateSlug(validatedData.name) }),
            },
            include: {
                _count: {
                    select: { videos: true },
                },
            },
        })

        return NextResponse.json({
            message: "Tag updated successfully",
            tag: {
                ...updatedTag,
                videoCount: updatedTag._count.videos,
            },
        })
    } catch (error) {
        console.error("Update tag error:", error)
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ error: "Failed to update tag" }, { status: 500 })
    }
}

// DELETE - Delete tag
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    try {
        const user = await getUserFromRequest(request)
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden - Only admin can delete tags" }, { status: 403 })
        }

        const tag = await prisma.tag.findUnique({
            where: { id: params.id },
        })

        if (!tag) {
            return NextResponse.json({ error: "Tag not found" }, { status: 404 })
        }

        // Delete tag (cascade will handle video relations)
        await prisma.tag.delete({
            where: { id: params.id },
        })

        return NextResponse.json({
            message: "Tag deleted successfully",
        })
    } catch (error) {
        console.error("Delete tag error:", error)
        return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 })
    }
}
