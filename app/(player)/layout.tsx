import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Video Embed",
    robots: "noindex",
}

export default function EmbedLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
            </head>
            <body style={{ margin: 0, padding: 0, overflow: 'hidden', background: '#000', color: '#fff' }}>
                {children}
            </body>
        </html>
    )
}
