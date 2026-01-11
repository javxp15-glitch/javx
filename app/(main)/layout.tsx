import type React from "react"
import { Navigation } from "@/components/navigation"

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <>
            <Navigation />
            <main className="pt-24 min-h-screen">
                {children}
            </main>
        </>
    )
}
