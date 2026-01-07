import { LoginForm } from "@/components/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayCircle } from "lucide-react"

export const metadata = {
  title: "Login - StreamVault",
  description: "Login to your account",
}

export default function LoginPage() {
  return (
    <div className="relative min-h-[calc(100vh-6rem)] bg-background flex items-center justify-center p-4 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow delay-1000" />

      <Card className="w-full max-w-md relative z-10 border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl shadow-black/50">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/20">
              <PlayCircle className="w-8 h-8 fill-current" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Enter your credentials to access your vault
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
