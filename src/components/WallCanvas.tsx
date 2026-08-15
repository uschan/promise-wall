import { useEffect, useMemo, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { WallEngine } from "../engine/WallEngine"
import { useAppStore } from "../store/useAppStore"
import { filterPromises } from "../lib/filter"
import { isSupabaseConfigured } from "../lib/supabase"
import { upsertPromise } from "../lib/api"
import { useT } from "../i18n/useT"

export function WallCanvas() {
  const t = useT()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<WallEngine | null>(null)
  const promises = useAppStore((s) => s.promises)
  const activeCategory = useAppStore((s) => s.activeCategory)
  const view = useAppStore((s) => s.view)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const userId = useAppStore((s) => s.userId)
  const placing = useAppStore((s) => s.placing)
  const queryClient = useQueryClient()

  const visible = useMemo(
    () => filterPromises(promises, activeCategory, searchQuery, view, userId),
    [promises, activeCategory, searchQuery, view, userId],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = new WallEngine(canvas)
    engine.onSelect = (id) => useAppStore.getState().select(id)
    engine.onPlace = (x, y) => {
      const p = useAppStore.getState().placing
      if (!p) return
      const placed = { ...p, x, y }
      const uid = useAppStore.getState().userId
      if (isSupabaseConfigured && uid) {
        void upsertPromise(placed, uid).then(() =>
          queryClient.invalidateQueries({ queryKey: ["promises"] }),
        )
      } else {
        useAppStore.getState().addPromise(placed)
      }
      useAppStore.getState().setPlacing(null)
    }
    const st = useAppStore.getState()
    engine.setPromises(
      filterPromises(st.promises, st.activeCategory, st.searchQuery, st.view, st.userId),
    )
    engineRef.current = engine
    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [queryClient])

  useEffect(() => {
    engineRef.current?.setPromises(visible)
  }, [visible])

  useEffect(() => {
    engineRef.current?.setPlacing(!!placing)
  }, [placing])

  return (
    <>
      <canvas id="scene" ref={canvasRef} />
      {visible.length === 0 && promises.length > 0 && (
        <div id="emptyHint" className="show">
          {t("empty")}
        </div>
      )}
    </>
  )
}
