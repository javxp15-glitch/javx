"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Code, Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface EmbedCodeDialogProps {
  videoId: string
  videoTitle: string
  thumbnailUrl?: string | null
}

export function EmbedCodeDialog({ videoId, videoTitle, thumbnailUrl }: EmbedCodeDialogProps) {
  const [copied, setCopied] = useState(false)
  const [width, setWidth] = useState("640")
  const [height, setHeight] = useState("360")
  const [useFacade, setUseFacade] = useState(true)

  const embedUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/embed/${videoId}`

  // Facade HTML for srcdoc
  // Escape title for HTML attribute
  const safeTitle = videoTitle.replace(/'/g, "&apos;").replace(/"/g, "&quot;")

  const facadeHtml = `
<style>
  *{padding:0;margin:0;overflow:hidden}
  html,body{height:100%}
  img,span{position:absolute;width:100%;top:0;bottom:0;margin:auto}
  span{height:1.5em;text-align:center;font:48px/1.5 sans-serif;color:white;text-shadow:0 0 0.5em black}
</style>
<a href=${embedUrl}?autoplay=1><img src=${thumbnailUrl} alt='${safeTitle}' style='object-fit:cover'><span>▶</span></a>
`
  // Clean up whitespace and escape double quotes for the srcdoc attribute value
  const cleanFacadeHtml = facadeHtml.replace(/\s+/g, ' ').trim().replace(/"/g, '&quot;')

  const iframeSrc = useFacade && thumbnailUrl
    ? `src="${embedUrl}" srcdoc="${cleanFacadeHtml}"`
    : `src="${embedUrl}"`

  const embedCode = `<iframe
  ${iframeSrc}
  width="${width}"
  height="${height}"
  frameborder="0"
  allowfullscreen
  loading="lazy"
  title="${videoTitle}">
</iframe>`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      toast.success("Embed code copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("Failed to copy embed code")
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Code className="h-4 w-4 mr-2" />
          Get Embed Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Embed Video</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">Width (px)</Label>
              <Input id="width" value={width} onChange={(e) => setWidth(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (px)</Label>
              <Input id="height" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Embed Code</Label>
              <Button size="sm" variant="ghost" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all">
              <code>{embedCode}</code>
            </pre>
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              {/* Preview the actual iframe behavior */}
              <div dangerouslySetInnerHTML={{ __html: embedCode }} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
