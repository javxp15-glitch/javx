import { type NextRequest, NextResponse } from "next/server"

/**
 * Video Proxy API Route
 *
 * This endpoint proxies video files from Cloudflare R2 and adds proper headers
 * for iOS/mobile video playback support:
 * - CORS headers
 * - Range request support (critical for iOS)
 * - Proper Content-Type
 * - Cache headers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const videoPath = path.join('/')

    // Construct R2 public URL
    const r2Domain = process.env.R2_PUBLIC_DOMAIN || 'https://video.blowjob289.com'
    const videoUrl = `${r2Domain}/${videoPath}`

    // Get range header from request (iOS sends this for seeking)
    const rangeHeader = request.headers.get('range')

    // Prepare headers for R2 request
    const r2Headers: HeadersInit = {}
    if (rangeHeader) {
      r2Headers['Range'] = rangeHeader
    }

    // Fetch video from R2
    const r2Response = await fetch(videoUrl, {
      headers: r2Headers,
    })

    if (!r2Response.ok) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: r2Response.status }
      )
    }

    // Get the video stream
    const videoStream = r2Response.body

    if (!videoStream) {
      return NextResponse.json(
        { error: 'No video stream' },
        { status: 500 }
      )
    }

    // Determine status code (206 for range requests, 200 for full request)
    const statusCode = rangeHeader && r2Response.status === 206 ? 206 : 200

    // Create response with proper headers
    const response = new NextResponse(videoStream, { status: statusCode })

    // CRITICAL: Copy Content-Range header from R2 response (for iOS seeking)
    const contentRange = r2Response.headers.get('content-range')
    if (contentRange) {
      response.headers.set('Content-Range', contentRange)
    }

    // CRITICAL: Accept-Ranges header (tells iOS that seeking is supported)
    response.headers.set('Accept-Ranges', 'bytes')

    // Content-Type (always set to video/mp4)
    const contentType = r2Response.headers.get('content-type') || 'video/mp4'
    response.headers.set('Content-Type', contentType)

    // Content-Length
    const contentLength = r2Response.headers.get('content-length')
    if (contentLength) {
      response.headers.set('Content-Length', contentLength)
    }

    // CORS headers (allow all origins for public videos)
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Range, Content-Type')
    response.headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges')

    // Cache headers (cache video for 1 hour)
    response.headers.set('Cache-Control', 'public, max-age=3600, immutable')

    // Additional headers for better compatibility
    response.headers.set('X-Content-Type-Options', 'nosniff')

    return response
  } catch (error) {
    console.error('[Video Proxy] Error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy video' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
