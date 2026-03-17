"use client"

import { useEffect, useRef, useState } from "react"

interface EmbedPlayerProps {
  videoId: string
  title: string
}

export default function EmbedPlayer({ videoId, title }: EmbedPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    fetch(`/api/embed/${videoId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d.error || "Failed to load video"))
        return res.json()
      })
      .then((data) => {
        if (videoRef.current && data.video?.videoUrl) {
          videoRef.current.src = data.video.videoUrl
          setLoading(false)
        }
      })
      .catch((err) => {
        if (err !== "AbortError" && err?.name !== "AbortError") {
          setError(typeof err === "string" ? err : "Failed to load video")
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [videoId])

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#000',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>!</div>
        <p style={{ fontSize: '16px', color: '#ccc' }}>{error}</p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#000' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}
      <video
        ref={videoRef}
        controls
        autoPlay
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
        title={title}
      />
    </div>
  )
}
