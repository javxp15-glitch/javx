"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FolderOpen, Globe, User, Tag, Shield, ArrowLeft, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const tabs = [
    {
        name: "หมวดหมู่",
        href: "/admin/categories",
        icon: FolderOpen,
        color: "emerald",
        title: "จัดการหมวดหมู่",
        description: "สร้าง แก้ไข และลบหมวดหมู่สำหรับจัดระเบียบวิดีโอ",
    },
    {
        name: "โดเมน",
        href: "/admin/domains",
        icon: Globe,
        color: "purple",
        title: "จัดการโดเมน",
        description: "โดเมนที่อนุญาตให้ฝังวิดีโอที่มีการจำกัดโดเมนได้",
    },
    {
        name: "นักแสดง",
        href: "/admin/pornstars",
        icon: User,
        color: "pink",
        title: "จัดการนักแสดง",
        description: "จัดการโปรไฟล์นักแสดงและวิดีโอที่เกี่ยวข้อง",
    },
    {
        name: "แท็ก",
        href: "/admin/tags",
        icon: Tag,
        color: "blue",
        title: "จัดการแท็ก",
        description: "จัดการแท็กสำหรับการจัดหมวดหมู่วิดีโอ",
    },
    {
        name: "นำเข้า",
        href: "/admin/import",
        icon: FileSpreadsheet,
        color: "orange",
        title: "นำเข้าวิดีโอ",
        description: "นำเข้าวิดีโอจากไฟล์ Excel พร้อมอัปโหลดไฟล์วิดีโอ",
    },
]

const colorClasses = {
    emerald: {
        bg: "bg-emerald-500/10",
        bgHover: "hover:bg-emerald-500/20",
        border: "border-emerald-500/20",
        gradient: "from-emerald-500 to-emerald-600",
        shadow: "shadow-emerald-500/20",
        text: "text-emerald-400",
        blur: "bg-emerald-500/10",
        active: "border-b-emerald-400 text-emerald-400",
    },
    purple: {
        bg: "bg-purple-500/10",
        bgHover: "hover:bg-purple-500/20",
        border: "border-purple-500/20",
        gradient: "from-purple-500 to-purple-600",
        shadow: "shadow-purple-500/20",
        text: "text-purple-400",
        blur: "bg-purple-500/10",
        active: "border-b-purple-400 text-purple-400",
    },
    pink: {
        bg: "bg-pink-500/10",
        bgHover: "hover:bg-pink-500/20",
        border: "border-pink-500/20",
        gradient: "from-pink-500 to-pink-600",
        shadow: "shadow-pink-500/20",
        text: "text-pink-400",
        blur: "bg-pink-500/10",
        active: "border-b-pink-400 text-pink-400",
    },
    blue: {
        bg: "bg-blue-500/10",
        bgHover: "hover:bg-blue-500/20",
        border: "border-blue-500/20",
        gradient: "from-blue-500 to-blue-600",
        shadow: "shadow-blue-500/20",
        text: "text-blue-400",
        blur: "bg-blue-500/10",
        active: "border-b-blue-400 text-blue-400",
    },
    orange: {
        bg: "bg-orange-500/10",
        bgHover: "hover:bg-orange-500/20",
        border: "border-orange-500/20",
        gradient: "from-orange-500 to-orange-600",
        shadow: "shadow-orange-500/20",
        text: "text-orange-400",
        blur: "bg-orange-500/10",
        active: "border-b-orange-400 text-orange-400",
    },
}

interface AdminLayoutProps {
    children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const pathname = usePathname()
    const activeTab = tabs.find((tab) => pathname === tab.href) || tabs[0]
    const colors = colorClasses[activeTab.color as keyof typeof colorClasses]
    const Icon = activeTab.icon

    return (
        <div className="min-h-screen bg-background relative">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={cn("absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl", colors.blur)} />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto px-4 py-24 relative z-10">
                {/* Back button */}
                <Button variant="ghost" asChild className="mb-6 text-muted-foreground hover:text-white pl-0">
                    <Link href="/admin">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        กลับ
                    </Link>
                </Button>

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-3">
                        <div className={cn(
                            "flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br shadow-lg",
                            colors.gradient,
                            colors.shadow
                        )}>
                            <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">{activeTab.title}</h1>
                            <p className="text-muted-foreground">{activeTab.description}</p>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="mb-6">
                    <div className="flex gap-1 p-1 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 w-fit">
                        {tabs.map((tab) => {
                            const isActive = pathname === tab.href
                            const TabIcon = tab.icon
                            const tabColors = colorClasses[tab.color as keyof typeof colorClasses]

                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                        isActive
                                            ? cn("bg-white/10", tabColors.text)
                                            : "text-muted-foreground hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <TabIcon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{tab.name}</span>
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
                    {children}
                </div>
            </div>
        </div>
    )
}
