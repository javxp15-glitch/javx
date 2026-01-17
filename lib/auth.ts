import type { NextRequest } from "next/server"
import { jwtVerify, SignJWT } from "jose"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { createHash } from "crypto"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

/**
 * Generate JWT Token
 */
export async function generateToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET)
}

/**
 * Verify JWT Token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch (error) {
    return null
  }
}

/**
 * Hash API Token (SHA-256)
 */
export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * Get user from request (Supports JWT and API Token)
 */
export async function getUserFromRequest(request: NextRequest): Promise<JWTPayload | null> {
  const authHeader = request.headers.get("authorization")
  const token = request.cookies.get("token")?.value || authHeader?.replace("Bearer ", "")

  if (!token) return null

  // 1. Try Validating as JWT
  const jwtPayload = await verifyToken(token)
  if (jwtPayload) {
    return jwtPayload
  }

  // 2. Try Validating as API Token
  // Optimization: Only check DB if token format looks like an API key (e.g. starts with 'javx_')
  // For now, checks everything that isn't a JWT
  try {
    const hashedToken = hashApiToken(token)
    const apiToken = await prisma.apiToken.findUnique({
      where: { tokenHash: hashedToken },
      include: { createdBy: true },
    })

    if (apiToken && (!apiToken.expiresAt || apiToken.expiresAt > new Date())) {
      if (apiToken.revokedAt) return null

      // Update last used at (non-blocking)
      prisma.apiToken.update({
        where: { id: apiToken.id },
        data: { lastUsedAt: new Date() },
      }).catch(console.error)

      return {
        userId: apiToken.createdById,
        email: apiToken.createdBy.email,
        role: apiToken.createdBy.role,
      }
    }
  } catch (error) {
    // Ignore DB errors (e.g. if DB not reachable)
    console.error("API Token validation error:", error)
  }

  return null
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10)
}

/**
 * Compare password
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}

/**
 * Check if user has required role
 */
export function hasRequiredRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole)
}
