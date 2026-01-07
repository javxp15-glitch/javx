import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CategoryManager } from "@/components/category-manager"
import { DomainManager } from "@/components/domain-manager"
import { FolderOpen, Globe, Settings, Shield } from "lucide-react"

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
                            <p className="text-muted-foreground">จัดการหมวดหมู่วิดีโอและโดเมนที่อนุญาต</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="categories" className="space-y-8">
                    <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl">
                        <TabsTrigger
                            value="categories"
                            className="flex items-center gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg px-6 py-2.5"
                        >
                            <FolderOpen className="h-4 w-4" />
                            หมวดหมู่
                        </TabsTrigger>
                        <TabsTrigger
                            value="domains"
                            className="flex items-center gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg px-6 py-2.5"
                        >
                            <Globe className="h-4 w-4" />
                            โดเมน
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="categories">
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <FolderOpen className="h-5 w-5 text-primary" />
                                    จัดการหมวดหมู่
                                </h2>
                                <p className="text-muted-foreground text-sm mt-1">สร้าง แก้ไข และลบหมวดหมู่สำหรับจัดระเบียบวิดีโอ</p>
                            </div>
                            <CategoryManager />
                        </div>
                    </TabsContent>

                    <TabsContent value="domains">
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-primary" />
                                    จัดการโดเมน
                                </h2>
                                <p className="text-muted-foreground text-sm mt-1">โดเมนที่อนุญาตให้ฝังวิดีโอที่มีการจำกัดโดเมนได้</p>
                            </div>
                            <DomainManager />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
