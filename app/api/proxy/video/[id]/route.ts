
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getR2Client, getR2Config, buildR2ObjectKeyCandidates } from "@/lib/r2"
import { GetObjectCommand, HeadObjectCommand, type GetObjectCommandInput, type GetObjectCommandOutput } from "@aws-sdk/client-s3"

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    try {
        const videoId = params.id.replace(/\.(mp4|webm|mov|avi|m4v)$/i, "")

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
        const keys = buildR2ObjectKeyCandidates(video.videoUrl)
        if (!keys.length) {
            return new NextResponse("Invalid video configuration", { status: 500 })
        }

        // 3. Handle Range Request (Crucial for video streaming)
        const range = request.headers.get("range")
        const config = getR2Config()
        const client = getR2Client(config)

        try {
            let response: GetObjectCommandOutput | null = null
            let resolvedKey = ""

            for (const key of keys) {
                const commandInput: GetObjectCommandInput = {
                    Bucket: config.bucketName,
                    Key: key,
                }

                if (range) {
                    commandInput.Range = range
                }

                try {
                    response = await client.send(new GetObjectCommand(commandInput))
                    resolvedKey = key
                    break
                } catch (s3Error: any) {
                    const isMissingObject =
                        s3Error?.name === "NoSuchKey" ||
                        s3Error?.$metadata?.httpStatusCode === 404

                    if (!isMissingObject) {
                        throw s3Error
                    }
                }
            }

            if (!response) {
                return new NextResponse("File not found in storage", { status: 404 })
            }

            // 4. Stream response back
            const headers = new Headers()
            if (response.ContentLength) headers.set("Content-Length", response.ContentLength.toString())
            headers.set("Content-Type", response.ContentType || "video/mp4")
            if (response.ContentRange) headers.set("Content-Range", response.ContentRange)
            if (response.ETag) headers.set("ETag", response.ETag)
            // Always set Accept-Ranges — required for Safari/iOS video playback
            headers.set("Accept-Ranges", response.AcceptRanges || "bytes")
            headers.set("X-Javx-Resolved-Key", resolvedKey)

            // Cache headers
            headers.set("Cache-Control", "public, max-age=3600")
            headers.set("Access-Control-Allow-Origin", "*")

            // Use the integer status code from AWS or default to 200/206
            const status = response.$metadata.httpStatusCode || (range ? 206 : 200)

            // Convert AWS SDK body to a Web ReadableStream for NextResponse
            const body = response.Body
            let stream: ReadableStream | null = null
            if (body && typeof (body as any).transformToWebStream === "function") {
                stream = (body as any).transformToWebStream()
            } else {
                stream = body as unknown as ReadableStream
            }

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

// HEAD — Safari/iOS sends HEAD before playing to check Accept-Ranges support
export async function HEAD(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    try {
        const videoId = params.id.replace(/\.(mp4|webm|mov|avi|m4v)$/i, "")

        const video = await prisma.video.findUnique({
            where: { id: videoId },
            select: { id: true, videoUrl: true },
        })

        if (!video || !video.videoUrl) {
            return new NextResponse(null, { status: 404 })
        }

        const keys = buildR2ObjectKeyCandidates(video.videoUrl)
        if (!keys.length) {
            return new NextResponse(null, { status: 500 })
        }

        const config = getR2Config()
        const client = getR2Client(config)

        for (const key of keys) {
            try {
                const head = await client.send(new HeadObjectCommand({ Bucket: config.bucketName, Key: key }))

                const headers = new Headers()
                if (head.ContentLength) headers.set("Content-Length", head.ContentLength.toString())
                headers.set("Content-Type", head.ContentType || "video/mp4")
                headers.set("Accept-Ranges", "bytes")
                if (head.ETag) headers.set("ETag", head.ETag)
                headers.set("Cache-Control", "public, max-age=3600")
                headers.set("Access-Control-Allow-Origin", "*")

                return new NextResponse(null, { status: 200, headers })
            } catch (s3Error: any) {
                if (s3Error?.name !== "NotFound" && s3Error?.$metadata?.httpStatusCode !== 404) {
                    throw s3Error
                }
            }
        }

        return new NextResponse(null, { status: 404 })
    } catch (error) {
        console.error("HEAD Proxy Error:", error)
        return new NextResponse(null, { status: 500 })
    }
}
