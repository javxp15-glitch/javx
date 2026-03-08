"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Globe, Menu, UploadCloud, Video, PlayCircle, Settings } from "lucide-react"

type NavUser = {
  id: string
  email: string
  name: string | null
  role: string
}

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<NavUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const isEmbed = pathname.startsWith("/embed")

  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (isEmbed) {
      setLoading(false)
      return
    }

    let active = true

    async function fetchUser() {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" })
        if (!response.ok) {
          if (active) setUser(null)
          return
        }
        const data = await response.json()
        if (active) setUser(data.user)
      } catch (error) {
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchUser()

    return () => {
      active = false
    }
  }, [isEmbed])

  if (isEmbed) {
    return null
  }

  const initials = useMemo(() => {
    if (!user) return ""
    const source = user.name?.trim() || user.email
    const parts = source.split(" ").filter(Boolean)
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase()
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }, [user])

  const navLinks = [
    { href: "/videos", label: "Browse" },
    ...(user ? [{ href: "/videos/upload", label: "Upload" }] : []),
    ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []),
  ]

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Logout failed")
      }
      toast.success("Logged out successfully")
      setUser(null)
      router.push("/login")
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Logout failed"
      toast.error(message)
    }
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/5",
        scrolled
          ? "bg-background/80 backdrop-blur-xl py-2 shadow-lg shadow-black/10"
          : "bg-background/20 backdrop-blur-md py-4"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold group">
            <div className="relative flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/20 transition-transform duration-300 group-hover:scale-110">
              <PlayCircle className="w-5 h-5 fill-current" />
            </div>
            <span className="text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              StreamVault
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Mobile Menu */}
            {mounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground hover:text-white">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-background/90 backdrop-blur-xl border-white/10">
                  {navLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link href={link.href} className="cursor-pointer">{link.label}</Link>
                    </DropdownMenuItem>
                  ))}
                  {!user && (
                    <>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem asChild>
                        <Link href="/login">Login</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground hover:text-white" aria-hidden="true" tabIndex={-1}>
                <Menu className="h-5 w-5" />
              </Button>
            )}

            {user && (
              <Button
                asChild
                size="sm"
                className={cn(
                  "hidden sm:inline-flex rounded-full bg-gradient-to-r from-primary to-accent border-0 hover:opacity-90 shadow-lg shadow-primary/20",
                  scrolled ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm"
                )}
              >
                <Link href="/videos">
                  <Video className="mr-2 h-4 w-4" />
                  Video
                </Link>
              </Button>
            )}

            {!mounted || loading ? (
              <div className="h-9 w-24 rounded-full bg-muted/20 animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 rounded-full pl-2 pr-4 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all">
                    <Avatar className="h-8 w-8 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/20 text-primary">{initials || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="hidden flex-col items-start sm:flex">
                      <span className="text-sm font-medium leading-none text-white">{user.name || "User"}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[220px] bg-background/95 backdrop-blur-xl border-white/10 p-2">
                  <DropdownMenuLabel className="space-y-1 px-2 pb-2">
                    <div className="text-sm font-medium text-white">{user.name || user.email}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 text-[10px] h-5">{user.role}</Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild className="rounded-lg focus:bg-white/10">
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                      Account
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "ADMIN" && (
                    <DropdownMenuItem asChild className="rounded-lg focus:bg-white/10">
                      <Link href="/admin" className="cursor-pointer">
                        <Globe className="mr-2 h-4 w-4 text-accent" />
                        Setting
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg cursor-pointer">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild className="text-muted-foreground hover:text-white hover:bg-white/5">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild className="hidden sm:inline-flex rounded-full bg-white text-black hover:bg-white/90 border-0">
                  <Link href="/videos">Start Watching</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
