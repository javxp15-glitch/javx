import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CategoryManager } from "@/components/category-manager"
import { DomainManager } from "@/components/domain-manager"
import { FolderOpen, Globe, Settings } from "lucide-react"

export const metadata = {
    title: "การตั้งค่าแอดมิน - Media Storage",
    description: "จัดการหมวดหมู่และโดเมน",
}

export default function AdminPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Settings className="h-8 w-8" />
                        การตั้งค่าแอดมิน
                    </h1>
                    <p className="text-muted-foreground mt-2">จัดการหมวดหมู่วิดีโอและโดเมนที่อนุญาต</p>
                </div>

                <Tabs defaultValue="categories" className="space-y-6">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="categories" className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4" />
                            หมวดหมู่
                        </TabsTrigger>
                        <TabsTrigger value="domains" className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            โดเมน
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="categories">
                        <Card>
                            <CardHeader>
                                <CardTitle>จัดการหมวดหมู่</CardTitle>
                                <CardDescription>สร้าง แก้ไข และลบหมวดหมู่สำหรับจัดระเบียบวิดีโอ</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CategoryManager />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="domains">
                        <Card>
                            <CardHeader>
                                <CardTitle>จัดการโดเมน</CardTitle>
                                <CardDescription>โดเมนที่อนุญาตให้ฝังวิดีโอที่มีการจำกัดโดเมนได้</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <DomainManager />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
