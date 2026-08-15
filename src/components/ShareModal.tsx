import { useEffect, useRef } from "react"
import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { drawShareCard } from "../lib/shareCard"

export function ShareModal() {
  const t = useT()
  const shareId = useAppStore((s) => s.shareId)
  const setShareId = useAppStore((s) => s.setShareId)
  const promise = useAppStore((s) => s.promises.find((p) => p.id === s.shareId))
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (shareId && promise && canvasRef.current) {
      drawShareCard(canvasRef.current, promise)
    }
  }, [shareId, promise])

  if (!shareId || !promise) return null

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement("a")
    a.href = canvas.toDataURL("image/png")
    a.download = "wishcollective-promise.png"
    a.click()
  }

  const share = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], "promise.png", { type: "image/png" })
      navigator.share({ files: [file], title: "WishCollective" }).catch(() => {})
    })
  }

  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator

  return (
    <div className="overlay" onClick={() => setShareId(null)}>
      <div className="share" onClick={(e) => e.stopPropagation()}>
        <div className="av-head">
          <h2>{t("panel.share")}</h2>
          <button className="close" onClick={() => setShareId(null)} aria-label="Close">
            ×
          </button>
        </div>
        <canvas ref={canvasRef} width={600} height={400} className="share-canvas" />
        <div className="mod-actions">
          <button className="pill primary" onClick={download}>
            {t("share.download")}
          </button>
          {canNativeShare && (
            <button className="pill" onClick={share}>
              {t("share.native")}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
