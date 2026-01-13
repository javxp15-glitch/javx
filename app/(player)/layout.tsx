import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Video Embed",
    robots: "noindex",
    viewport: {
        width: 'device-width',
        initialScale: 1,
        maximumScale: 1,
        userScalable: false,
    },
}

export default function EmbedLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const videoCDN = process.env.R2_PUBLIC_DOMAIN || 'https://video.blowjob289.com'

    return (
        <html lang="en">
            <head>
                {/* Preconnect to video CDN for faster video loading */}
                <link rel="preconnect" href={videoCDN} />
                <link rel="dns-prefetch" href={videoCDN} />
            </head>
            <body style={{ margin: 0, padding: 0, overflow: 'hidden', background: '#000', color: '#fff' }}>
                {children}
            </body>
        </html>
    )
}
