import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
    newPassword: z.string().min(6, "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร"),
})

// PUT - Change password
export async function PUT(request: NextRequest) {
    try {
        const authUser = await getUserFromRequest(request)
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const validatedData = changePasswordSchema.parse(body)

        const user = await prisma.user.findUnique({
            where: { id: authUser.userId },
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(validatedData.currentPassword, user.password)
        if (!isValidPassword) {
            return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 400 })
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10)

        await prisma.user.update({
            where: { id: authUser.userId },
            data: { password: hashedPassword },
        })

        return NextResponse.json({
            message: "เปลี่ยนรหัสผ่านเรียบร้อย",
        })
    } catch (error) {
        console.error("Change password error:", error)
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
    }
}
