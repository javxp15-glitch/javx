"use client"

import React, { useEffect, useRef } from "react"
import Hls from "hls.js"
import mpegts from "mpegts.js"
import "plyr/dist/plyr.css"
import Plyr, { APITypes } from "plyr-react"

interface VideoPlayerProps {
  src: string
  poster?: string
  className?: string
}

export default function VideoPlayer({ src, poster, className }: VideoPlayerProps) {
  const ref = useRef<APITypes>(null)

  useEffect(() => {
    const loadVideo = async () => {
      const video = (ref.current as any)?.plyr?.media as HTMLVideoElement
      if (!video) return

      // Case 1: HLS Stream (.m3u8)
      if (src.includes(".m3u8")) {
        if (Hls.isSupported()) {
          const hls = new Hls()
          hls.loadSource(src)
          hls.attachMedia(video)
          // @ts-ignore
          window.hls = hls
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Native HLS support (Safari)
          video.src = src
        }
      }
      // Case 2: TS Stream (.ts) via mpegts.js
      else if (src.endsWith(".ts")) {
        if (mpegts.isSupported()) {
          const player = mpegts.createPlayer({
            type: 'mpegts',
            url: src,
            isLive: false,
            enableStashBuffer: false
          })
          player.attachMediaElement(video)
          player.load()
          // @ts-ignore
          window.mpegtsPlayer = player
        }
      }
      // Case 3: MP4 or other direct files
      else {
        video.src = src
      }
    }

    loadVideo()
  }, [src])

  return (
    <div className={`w-full ${className}`}>
      <Plyr
        id="plyr"
        ref={ref}
        source={{} as any} // Source is handled manually via HLS/mpegts/video tag
        options={{
          ratio: '16:9', // Force 16:9 aspect ratio
          controls: [
            'play-large',
            'play',
            'progress',
            'current-time',
            'mute',
            'volume',
            'captions',
            'settings',
            'pip',
            'airplay',
            'fullscreen',
          ],
          settings: ['captions', 'quality', 'speed'],
          speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
          quality: { default: 576, options: [4320, 2880, 2160, 1440, 1080, 720, 576, 480, 360, 240] },
        }}
        color="#DE2600" // Custom primary color
      >
        <video
          id="plyr"
          className="plyr-react plyr"
          playsInline
          poster={poster}
          data-poster={poster}
        />
      </Plyr>
      <style jsx global>{`
                :root {
                    --plyr-color-main: #DE2600;
                    --plyr-video-background: #000;
                }
                .plyr--full-ui input[type=range] {
                    color: #DE2600;
                }
                .plyr__control--overlaid {
                    background: rgba(222, 38, 0, 0.8);
                }
                .plyr__control--overlaid:hover {
                    background: #DE2600;
                }
            `}</style>
    </div>
  )
}
