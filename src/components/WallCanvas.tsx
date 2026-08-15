import { useEffect, useMemo, useRef } from "react"
import { WallEngine } from "../engine/WallEngine"
import { useAppStore } from "../store/useAppStore"
import { filterPromises } from "../lib/filter"

export function WallCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<WallEngine | null>(null)
  const promises = useAppStore((s) => s.promises)
  const activeCategory = useAppStore((s) => s.activeCategory)
  const view = useAppStore((s) => s.view)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const userId = useAppStore((s) => s.userId)

  const visible = useMemo(
    () => filterPromises(promises, activeCategory, searchQuery, view, userId),
    [promises, activeCategory, searchQuery, view, userId],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = new WallEngine(canvas)
    engine.onSelect = (id) => useAppStore.getState().select(id)
    const st = useAppStore.getState()
    engine.setPromises(
      filterPromises(st.promises, st.activeCategory, st.searchQuery, st.view, st.userId),
    )
    engineRef.current = engine
    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    engineRef.current?.setPromises(visible)
  }, [visible])

  return <canvas id="scene" ref={canvasRef} />
}
