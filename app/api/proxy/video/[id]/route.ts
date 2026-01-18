
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getR2Client, getR2Config, extractR2Key } from "@/lib/r2"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { Readable } from "stream"

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    try {
        const videoId = params.id

        // 1. Get video info from DB
        const video = await prisma.video.findUnique({
            where: { id: videoId },
            select: {
                id: true,
                videoUrl: true,
                status: true,
                visibility: true,
            }
        })

        if (!video || !video.videoUrl) {
            return new NextResponse("Video not found", { status: 404 })
        }

        // 2. Extract Key from URL
        const key = extractR2Key(video.videoUrl)
        if (!key) {
            return new NextResponse("Invalid video configuration", { status: 500 })
        }

        // 3. Handle Range Request (Crucial for video streaming)
        const range = request.headers.get("range")
        const config = getR2Config()
        const client = getR2Client(config)

        const commandInput: any = {
            Bucket: config.bucketName,
            Key: key,
        }

        if (range) {
            commandInput.Range = range
        }

        const command = new GetObjectCommand(commandInput)

        try {
            const response = await client.send(command)

            // 4. Stream response back
            const headers = new Headers()
            if (response.ContentLength) headers.set("Content-Length", response.ContentLength.toString())
            if (response.ContentType) headers.set("Content-Type", response.ContentType)
            if (response.pnpmContentRange) headers.set("Content-Range", response.ContentRange)
            if (response.ETag) headers.set("ETag", response.ETag)
            if (response.AcceptRanges) headers.set("Accept-Ranges", response.AcceptRanges)

            // Cache headers
            headers.set("Cache-Control", "public, max-age=3600")
            headers.set("Access-Control-Allow-Origin", "*")

            // Use the integer status code from AWS or default to 200/206
            const status = response.$metadata.httpStatusCode || (range ? 206 : 200)

            // Convert Node.js Readable stream into Web ReadableStream
            // @ts-ignore - response.Body is a Node stream in aws-sdk v3 node environment
            const stream = response.Body as unknown as ReadableStream

            return new NextResponse(stream as any, {
                status,
                headers,
            })

        } catch (s3Error: any) {
            console.error("S3 Proxy Error:", s3Error)
            if (s3Error.name === "NoSuchKey") {
                return new NextResponse("File not found in storage", { status: 404 })
            }
            return new NextResponse("Storage access error", { status: 500 })
        }

    } catch (error) {
        console.error("Proxy Error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
