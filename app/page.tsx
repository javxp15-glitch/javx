import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Video, Upload, Shield, Search, Play, ArrowRight } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-6rem)] bg-background text-white selection:bg-primary selection:text-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-[100px] -z-10" />
        <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[80px] -z-10 animate-pulse-slow" />

        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary-foreground/80 mb-4 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Secure Media Vault v2.0
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/50 animate-slide-up">
              The Ultimate <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Media Experience</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-slide-up delay-100">
              Enterprise-grade video storage with cinema-quality playback, advanced access controls, and domain-level security.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 animate-slide-up delay-200">
              <Button asChild size="lg" className="rounded-full bg-white text-black hover:bg-white/90 font-semibold px-8 h-12 text-base transition-transform hover:scale-105">
                <Link href="/videos" className="flex items-center gap-2">
                  <Play className="w-4 h-4 fill-current" />
                  Start Watching
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-white px-8 h-12 text-base backdrop-blur-sm transition-transform hover:scale-105">
                <Link href="/login" className="flex items-center gap-2">
                  Member Access
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">Powerhouse Features</h2>
            <p className="text-muted-foreground">Everything you need to manage your media securely</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Video className="h-6 w-6" />}
              title="Media Management"
              description="Seamlessly upload, organize, and manage your entire video library with intuitive tools."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Access Control"
              description="Granular permission settings with domain-level restrictions for ultimate security."
            />
            <FeatureCard
              icon={<Upload className="h-6 w-6" />}
              title="Global Delivery"
              description="Powered by Cloudflare R2 edge network for lightning-fast playback anywhere."
            />
            <FeatureCard
              icon={<Search className="h-6 w-6" />}
              title="Smart Discovery"
              description="Find exactly what you need in seconds with powerful filtering and search."
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="group bg-gradient-to-b from-white/5 to-transparent border-white/5 hover:border-primary/20 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1">
      <CardContent className="pt-8 pb-8 px-6 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
          {icon}
        </div>
        <h3 className="font-semibold text-xl text-white group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}
