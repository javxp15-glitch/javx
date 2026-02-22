"use client"

import { useState } from "react"
import { Clapperboard } from "lucide-react"

export function RetranscodeMovButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleClick = async () => {
    if (!confirm("แปลงวิดีโอ .mov ทั้งหมดให้เป็น MP4 ใช่หรือไม่?\nกระบวนการนี้จะทำงานในพื้นหลัง")) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/retranscode-mov", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด")
      setResult(data.message)
    } catch (err) {
      setResult(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex flex-col items-center gap-3 p-6 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed w-full text-left"
    >
      <Clapperboard className="h-8 w-8 text-yellow-400" />
      <div className="text-center">
        <p className="font-medium text-white group-hover:text-yellow-400 transition-colors">
          {loading ? "กำลังจัดคิว..." : "แปลง MOV → MP4"}
        </p>
        <p className="text-xs text-muted-foreground">
          {result ?? "Retranscode .mov videos"}
        </p>
      </div>
    </button>
  )
}
