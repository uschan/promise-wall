import { useEffect, useMemo, useRef } from "react"
import { WallEngine } from "../engine/WallEngine"
import { useAppStore } from "../store/useAppStore"
import { filterPromises } from "../lib/filter"

export function WallCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const engineRef = useRef<WallEngine | null>(null)
  const promises = useAppStore((s) => s.promises)
  const activeCategory = useAppStore((s) => s.activeCategory)
  const searchQuery = useAppStore((s) => s.searchQuery)

  const visible = useMemo(
    () => filterPromises(promises, activeCategory, searchQuery),
    [promises, activeCategory, searchQuery],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const engine = new WallEngine(container)
    engine.onSelect = (id) => useAppStore.getState().select(id)
    engine.setPromises(filterPromises(useAppStore.getState().promises, useAppStore.getState().activeCategory, useAppStore.getState().searchQuery))
    engineRef.current = engine
    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    engineRef.current?.setPromises(visible)
  }, [visible])

  return <div ref={containerRef} className="wall-canvas" />
}
