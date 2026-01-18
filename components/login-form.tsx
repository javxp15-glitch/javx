"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { loginSchema, type LoginInput } from "@/lib/validation"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setLoading(true)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success("Welcome back!", {
          description: "Login successful. Redirecting...",
        })
        router.push("/videos")
        router.refresh()
      } else {
        toast.error("Access Denied", {
          description: result.error || "Login failed",
        })
      }
    } catch (error) {
      toast.error("System Error", {
        description: "An error occurred. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-zinc-400">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@domain.com"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-primary/20 h-11"
          {...register("email")}
        />
        {errors.email && <p className="text-sm text-destructive font-medium">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-zinc-400">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-primary/20 h-11"
          {...register("password")}
        />
        {errors.password && <p className="text-sm text-destructive font-medium">{errors.password.message}</p>}
      </div>

      <Button
        type="submit"
        className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity font-semibold text-white shadow-lg shadow-primary/25"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Authenticating...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  )
}
