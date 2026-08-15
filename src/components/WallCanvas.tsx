import { useEffect, useRef } from "react"
import { WallEngine } from "../engine/WallEngine"
import { useAppStore } from "../store/useAppStore"

export function WallCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const engineRef = useRef<WallEngine | null>(null)
  const promises = useAppStore((s) => s.promises)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const engine = new WallEngine(container)
    engine.setPromises(useAppStore.getState().promises)
    engineRef.current = engine
    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    engineRef.current?.setPromises(promises)
  }, [promises])

  return <div ref={containerRef} className="wall-canvas" />
}
