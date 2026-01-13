/**
 * Video URL Utilities
 *
 * Helper functions to convert R2 direct URLs to proxied URLs
 * for better iOS/mobile compatibility
 */

/**
 * Convert R2 direct URL to proxied URL for iOS compatibility
 *
 * @param videoUrl - Direct R2 URL (e.g., https://video.blowjob289.com/videos/abc.mp4)
 * @param useProxy - Whether to use proxy (default: true for better iOS support)
 * @returns Proxied URL or original URL
 *
 * @example
 * const url = getVideoUrl('https://video.blowjob289.com/videos/test.mp4')
 * // Returns: '/api/video-proxy/videos/test.mp4'
 */
export function getVideoUrl(videoUrl: string, useProxy = true): string {
  if (!useProxy) {
    return videoUrl
  }

  // If already a proxy URL, return as-is
  if (videoUrl.startsWith('/api/video-proxy/')) {
    return videoUrl
  }

  try {
    // Support both browser and server environments
    const r2Domain = typeof process !== 'undefined' && process.env?.R2_PUBLIC_DOMAIN
      ? process.env.R2_PUBLIC_DOMAIN
      : 'https://video.blowjob289.com'

    // Extract path from R2 URL
    if (videoUrl.startsWith(r2Domain)) {
      const path = videoUrl.replace(r2Domain, '').replace(/^\//, '')
      return `/api/video-proxy/${path}`
    }

    // If it's already a relative path, add proxy prefix
    if (videoUrl.startsWith('/')) {
      return `/api/video-proxy${videoUrl}`
    }

    // For other domains, return as-is (external videos)
    return videoUrl
  } catch (error) {
    console.error('[getVideoUrl] Error converting URL:', error)
    return videoUrl
  }
}

/**
 * Check if URL is a video URL
 */
export function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.m4v']
  return videoExtensions.some(ext => url.toLowerCase().includes(ext))
}

/**
 * Get video key from R2 URL
 *
 * @example
 * getVideoKeyFromUrl('https://video.blowjob289.com/videos/test.mp4')
 * // Returns: 'videos/test.mp4'
 */
export function getVideoKeyFromUrl(videoUrl: string): string | null {
  try {
    const r2Domain = process.env.R2_PUBLIC_DOMAIN || 'https://video.blowjob289.com'

    if (videoUrl.startsWith(r2Domain)) {
      return videoUrl.replace(r2Domain, '').replace(/^\//, '')
    }

    return null
  } catch {
    return null
  }
}
