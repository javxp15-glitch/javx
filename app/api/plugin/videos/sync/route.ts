import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - Plugin Sync Trigger
// This endpoint is called by the WordPress plugin to "force sync" or check connectivity
export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request)
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (!["ADMIN", "EDITOR"].includes(user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Currently, this endpoint serves as a connectivity check and acknowledgment.
        // In a full implementation, it could accept a list of IDs to sync or trigger a specific job.
        // For now, returning success allows the plugin to proceed.

        const body = await request.json().catch(() => ({}))

        // You could log the sync request here
        console.log("Plugin sync triggered by user:", user.email, "Payload:", body)

        return NextResponse.json({
            message: "Sync acknowledged",
            status: "success",
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        console.error("Plugin sync error:", error)
        return NextResponse.json({ error: "Sync failed" }, { status: 500 })
    }
}
