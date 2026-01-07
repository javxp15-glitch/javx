"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Lock, Settings } from "lucide-react"
import { toast } from "sonner"

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
        return <div className="text-muted-foreground">กำลังโหลด...</div>
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">ชื่อ</Label>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ชื่อของคุณ"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="อีเมลของคุณ"
                />
            </div>
            <div className="space-y-2">
                <Label>สิทธิ์</Label>
                <Input value={profile.role} disabled className="bg-muted" />
            </div>
            <Button type="submit" disabled={loading}>
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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="currentPassword">รหัสผ่านปัจจุบัน</Label>
                <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
                <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
            </div>
            <Button type="submit" disabled={loading}>
                {loading ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
            </Button>
        </form>
    )
}

export default function SettingsPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Settings className="h-8 w-8" />
                        การตั้งค่า
                    </h1>
                    <p className="text-muted-foreground mt-2">จัดการโปรไฟล์และความปลอดภัย</p>
                </div>

                <Tabs defaultValue="profile" className="space-y-6">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="profile" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            โปรไฟล์
                        </TabsTrigger>
                        <TabsTrigger value="security" className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            ความปลอดภัย
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile">
                        <Card>
                            <CardHeader>
                                <CardTitle>ข้อมูลส่วนตัว</CardTitle>
                                <CardDescription>แก้ไขชื่อและอีเมลของคุณ</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ProfileTab />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="security">
                        <Card>
                            <CardHeader>
                                <CardTitle>เปลี่ยนรหัสผ่าน</CardTitle>
                                <CardDescription>อัพเดทรหัสผ่านของคุณ</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SecurityTab />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
