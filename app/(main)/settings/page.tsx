"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Lock, Settings, UserCircle } from "lucide-react"
import { toast } from "sonner"
import { AdminTokenManager } from "@/components/admin-token-manager"

interface UserProfile {
    id: string
    email: string
    name: string | null
    role: string
}

function ProfileTab() {
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            const response = await fetch("/api/users/me")
            if (response.ok) {
                const data = await response.json()
                setProfile(data.user)
                setName(data.user.name || "")
                setEmail(data.user.email)
            }
        } catch (error) {
            console.error("Failed to fetch profile:", error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const response = await fetch("/api/users/me", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email }),
            })

            const data = await response.json()
            if (response.ok) {
                toast.success(data.message)
                setProfile(data.user)
            } else {
                toast.error(data.error)
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาด")
        } finally {
            setLoading(false)
        }
    }

    if (!profile) {
        return <div className="text-muted-foreground text-center py-8">กำลังโหลด...</div>
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">ชื่อ</Label>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ชื่อของคุณ"
                    className="bg-white/5 border-white/10 focus:border-primary/50"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">อีเมล</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="อีเมลของคุณ"
                    className="bg-white/5 border-white/10 focus:border-primary/50"
                />
            </div>
            <div className="space-y-2">
                <Label className="text-gray-300">สิทธิ์</Label>
                <Input value={profile.role} disabled className="bg-white/5 border-white/10 text-muted-foreground" />
            </div>
            <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
                {loading ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
        </form>
    )
}

function SecurityTab() {
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (newPassword !== confirmPassword) {
            toast.error("รหัสผ่านใหม่ไม่ตรงกัน")
            return
        }

        setLoading(true)
        try {
            const response = await fetch("/api/users/me/password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            })

            const data = await response.json()
            if (response.ok) {
                toast.success(data.message)
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
            } else {
                toast.error(data.error)
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาด")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-gray-300">รหัสผ่านปัจจุบัน</Label>
                <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 focus:border-primary/50"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-gray-300">รหัสผ่านใหม่</Label>
                <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-white/5 border-white/10 focus:border-primary/50"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">ยืนยันรหัสผ่านใหม่</Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 focus:border-primary/50"
                />
            </div>
            <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
                {loading ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
            </Button>
        </form>
    )
}

export default function SettingsPage() {
    return (
        <div className="min-h-screen bg-background relative">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto px-4 py-24 relative z-10">
                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
                            <UserCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                                การตั้งค่า
                            </h1>
                            <p className="text-muted-foreground">จัดการโปรไฟล์และความปลอดภัย</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="profile" className="space-y-8">
                    <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl">
                        <TabsTrigger
                            value="profile"
                            className="flex items-center gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg px-6 py-2.5"
                        >
                            <User className="h-4 w-4" />
                            โปรไฟล์
                        </TabsTrigger>
                        <TabsTrigger
                            value="security"
                            className="flex items-center gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg px-6 py-2.5"
                        >
                            <Lock className="h-4 w-4" />
                            ความปลอดภัย
                        </TabsTrigger>
                        <TabsTrigger
                            value="api"
                            className="flex items-center gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg px-6 py-2.5"
                        >
                            <Settings className="h-4 w-4" />
                            API Tokens
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile">
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 max-w-xl">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" />
                                    ข้อมูลส่วนตัว
                                </h2>
                                <p className="text-muted-foreground text-sm mt-1">แก้ไขชื่อและอีเมลของคุณ</p>
                            </div>
                            <ProfileTab />
                        </div>
                    </TabsContent>

                    <TabsContent value="security">
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 max-w-xl">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <Lock className="h-5 w-5 text-primary" />
                                    เปลี่ยนรหัสผ่าน
                                </h2>
                                <p className="text-muted-foreground text-sm mt-1">อัพเดทรหัสผ่านของคุณ</p>
                            </div>
                            <SecurityTab />
                        </div>
                    </TabsContent>

                    <TabsContent value="api">
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 max-w-2xl">
                            <AdminTokenManager />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
