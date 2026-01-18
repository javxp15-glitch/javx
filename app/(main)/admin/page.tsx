import Link from "next/link"
import { FolderOpen, Globe, Shield, User, Tag } from "lucide-react"

export const metadata = {
    title: "การตั้งค่าแอดมิน - Media Storage",
    description: "จัดการหมวดหมู่และโดเมน",
}

export default function AdminPage() {
    return (
        <div className="min-h-screen bg-background relative">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto px-4 py-24 relative z-10">
                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
                            <Shield className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                                การตั้งค่าแอดมิน
                            </h1>
                            <p className="text-muted-foreground">จัดการข้อมูลทั้งหมดในระบบ</p>
                        </div>
                    </div>
                </div>

                {/* Quick Links Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link
                        href="/admin/categories"
                        className="flex flex-col items-center gap-3 p-6 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors group"
                    >
                        <FolderOpen className="h-8 w-8 text-emerald-400" />
                        <div className="text-center">
                            <p className="font-medium text-white group-hover:text-emerald-400 transition-colors">หมวดหมู่</p>
                            <p className="text-xs text-muted-foreground">Categories</p>
                        </div>
                    </Link>
                    <Link
                        href="/admin/domains"
                        className="flex flex-col items-center gap-3 p-6 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-colors group"
                    >
                        <Globe className="h-8 w-8 text-purple-400" />
                        <div className="text-center">
                            <p className="font-medium text-white group-hover:text-purple-400 transition-colors">โดเมน</p>
                            <p className="text-xs text-muted-foreground">Domains</p>
                        </div>
                    </Link>
                    <Link
                        href="/admin/pornstars"
                        className="flex flex-col items-center gap-3 p-6 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 transition-colors group"
                    >
                        <User className="h-8 w-8 text-pink-400" />
                        <div className="text-center">
                            <p className="font-medium text-white group-hover:text-pink-400 transition-colors">นักแสดง</p>
                            <p className="text-xs text-muted-foreground">Pornstars</p>
                        </div>
                    </Link>
                    <Link
                        href="/admin/tags"
                        className="flex flex-col items-center gap-3 p-6 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-colors group"
                    >
                        <Tag className="h-8 w-8 text-blue-400" />
                        <div className="text-center">
                            <p className="font-medium text-white group-hover:text-blue-400 transition-colors">แท็ก</p>
                            <p className="text-xs text-muted-foreground">Tags</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}
