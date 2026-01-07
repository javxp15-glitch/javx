import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateCategorySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    slug: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
})

// GET - Get single category
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    try {
        const category = await prisma.category.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: { videos: true },
                },
            },
        })

        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 })
        }

        return NextResponse.json({ category })
    } catch (error) {
        console.error("Get category error:", error)
        return NextResponse.json({ error: "Failed to fetch category" }, { status: 500 })
    }
}

// PUT - Update category (Admin only)
export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    try {
        const user = await getUserFromRequest(request)
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const category = await prisma.category.findUnique({
            where: { id: params.id },
        })

        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 })
        }

        const body = await request.json()
        const validatedData = updateCategorySchema.parse(body)

        const updatedCategory = await prisma.category.update({
            where: { id: params.id },
            data: validatedData,
        })

        return NextResponse.json({
            message: "Category updated successfully",
            category: updatedCategory,
        })
    } catch (error) {
        console.error("Update category error:", error)
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
    }
}

// DELETE - Delete category (Admin only)
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    try {
        const user = await getUserFromRequest(request)
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const category = await prisma.category.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: { videos: true },
                },
            },
        })

        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 })
        }

        // Delete category (videos will have categoryId set to null via onDelete: SetNull)
        await prisma.category.delete({
            where: { id: params.id },
        })

        return NextResponse.json({
            message: "Category deleted successfully",
        })
    } catch (error) {
        console.error("Delete category error:", error)
        return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
    }
}
