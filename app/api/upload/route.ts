import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { getSignedUploadUrl, generateUniqueFilename } from "@/lib/r2"

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB (R2 single PUT limit)
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check role permission
    if (!["ADMIN", "EDITOR"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { filename, fileType, fileSize, type } = body

    if (!filename || !fileType || !fileSize || !type) {
      return NextResponse.json({ error: "Missing file metadata" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = type === "thumbnail" ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}` },
        { status: 400 },
      )
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024 / 1024}GB` },
        { status: 400 },
      )
    }

    // Generate unique filename/key
    const startFilename = generateUniqueFilename(filename)
    const key = type === "thumbnail" ? `thumbnails/${startFilename.split('/').pop()}` : startFilename // Adjust path if needed, usually generateUniqueFilename handles basic structure but let's keep it simple

    // Generate Presigned URL
    const uploadUrl = await getSignedUploadUrl(key, fileType)

    return NextResponse.json(
      {
        uploadUrl,
        key, // key is effectively the path in the bucket
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Presigned URL error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
