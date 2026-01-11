import { VideoPlayer } from "@/components/video-player"
import { VideoInfo } from "@/components/video-info"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VideoDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background element */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 py-24">
        <div className="mb-6">
          <Button variant="ghost" asChild className="text-muted-foreground hover:text-white pl-0 hover:bg-transparent">
            <Link href="/videos" className="flex items-center gap-2 transition-transform hover:-translate-x-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Library
            </Link>
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Main Content (Player) */}
          <div className="lg:col-span-2 space-y-6">
            <VideoPlayer videoId={id} />
          </div>

          {/* Sidebar (Info) */}
          <div className="lg:col-span-1">
            <VideoInfo videoId={id} />
          </div>
        </div>
      </div>
    </div>
  )
}
