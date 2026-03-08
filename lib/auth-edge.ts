import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

export interface JWTPayload {
    userId: string
    email: string
    role: string
}

export async function verifyAuthEdge(req: Request): Promise<JWTPayload | null> {
    const token = getRequestToken(req)
    if (!token) return null

    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")
        const { payload } = await jwtVerify(token, secret)
        return payload as unknown as JWTPayload
    } catch (err) {
        return null
    }
}

export async function getEdgeUserFromRequest(req: NextRequest): Promise<JWTPayload | null> {
    return verifyAuthEdge(req)
}

function getRequestToken(req: Request): string | null {
    const authToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
    if (authToken) {
        return authToken
    }

    const nextRequest = req as NextRequest
    const cookieToken = nextRequest.cookies?.get?.("token")?.value
    if (cookieToken) {
        return cookieToken
    }

    const rawCookieHeader = req.headers.get("cookie") ?? ""
    const cookieTokenFromHeader = rawCookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("token="))
        ?.slice("token=".length)

    return cookieTokenFromHeader ? decodeURIComponent(cookieTokenFromHeader) : null
}
