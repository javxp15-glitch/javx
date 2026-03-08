import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePluginUser } from "@/lib/plugin-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function jsonResponse(data: Record<string, unknown>, status = 200) {
    return NextResponse.json(data, {
        status,
        headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
    })
}

async function buildHealthPayload(userEmail: string) {
    const totalReadyPublicVideos = await prisma.video.count({
        where: {
            status: "READY",
            visibility: "PUBLIC",
            OR: [{ mimeType: "video/mp4" }, { videoUrl: { endsWith: ".mp4" } }],
        },
    })

    return {
        ok: true,
        message: "Plugin API is ready",
        authenticated_as: userEmail,
        endpoints: {
            videos: "/api/plugin/videos",
            video_detail: "/api/plugin/videos/:id",
            sync_health: "/api/plugin/videos/sync",
        },
        recommendations: {
            batch_size: 20,
            order: "updated_asc",
        },
        stats: {
            total_ready_public_videos: totalReadyPublicVideos,
        },
        timestamp: new Date().toISOString(),
    }
}

// GET - Plugin health and capability check
export async function GET(request: NextRequest) {
    try {
        const authResult = await requirePluginUser(request)
        if (authResult instanceof Response) {
            return authResult
        }

        return jsonResponse(await buildHealthPayload(authResult.email))
    } catch (error) {
        console.error("Plugin sync health error:", error)
        return jsonResponse({ error: "Plugin health check failed" }, 500)
    }
}

// POST - Plugin sync connectivity check / manual handshake
export async function POST(request: NextRequest) {
    try {
        const authResult = await requirePluginUser(request)
        if (authResult instanceof Response) {
            return authResult
        }

        const body = await request.json().catch(() => ({}))

        console.log("Plugin sync triggered by user:", authResult.email, "Payload:", body)

        return jsonResponse({
            ...(await buildHealthPayload(authResult.email)),
            action: body?.action ?? "ping",
            status: "success",
        })
    } catch (error) {
        console.error("Plugin sync error:", error)
        return jsonResponse({ error: "Sync failed" }, 500)
    }
}
