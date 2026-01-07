import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const updateProfileSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
})

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
})

// GET - Get current user profile
export async function GET(request: NextRequest) {
    try {
        const authUser = await getUserFromRequest(request)
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: authUser.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        return NextResponse.json({ user })
    } catch (error) {
        console.error("Get profile error:", error)
        return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }
}

// PUT - Update profile
export async function PUT(request: NextRequest) {
    try {
        const authUser = await getUserFromRequest(request)
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const validatedData = updateProfileSchema.parse(body)

        // Check if email already exists (if changing email)
        if (validatedData.email) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    email: validatedData.email,
                    NOT: { id: authUser.userId },
                },
            })

            if (existingUser) {
                return NextResponse.json({ error: "อีเมลนี้ถูกใช้แล้ว" }, { status: 400 })
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: authUser.userId },
            data: validatedData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        })

        return NextResponse.json({
            message: "อัพเดทโปรไฟล์เรียบร้อย",
            user: updatedUser,
        })
    } catch (error) {
        console.error("Update profile error:", error)
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }
}
