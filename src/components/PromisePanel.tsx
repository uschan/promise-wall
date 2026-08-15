import { useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { PAPERS } from "../lib/papers"
import { categoryLabel } from "../lib/categories"
import { isSupabaseConfigured } from "../lib/supabase"
import { deletePromise } from "../lib/api"

export function PromisePanel() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const selectedId = useAppStore((s) => s.selectedId)
  const select = useAppStore((s) => s.select)
  const removePromise = useAppStore((s) => s.removePromise)
  const userId = useAppStore((s) => s.userId)
  const queryClient = useQueryClient()
  const promise = useAppStore((s) => s.promises.find((p) => p.id === s.selectedId))

  if (!selectedId || !promise) return null

  const paper = PAPERS[promise.paper ?? "classic"]
  const cat = promise.category ? categoryLabel(promise.category, lang) : ""

  const handleDelete = async () => {
    if (!window.confirm(t("panel.delete") + "?")) return
    if (isSupabaseConfigured && userId) {
      await deletePromise(promise.id)
      await queryClient.invalidateQueries({ queryKey: ["promises"] })
    } else {
      removePromise(promise.id)
    }
  }

  return (
    <aside className="panel">
      <button className="close" onClick={() => select(null)} aria-label="Close">
        ×
      </button>
      {cat && (
        <div className="p-cat" style={{ color: paper.ink }}>
          {cat}
        </div>
      )}
      <h2 className="p-title">{promise.text}</h2>
      {promise.body && <p className="p-body">{promise.body}</p>}
      {promise.imageData && <img className="p-image" src={promise.imageData} alt="" />}
      <p className="p-author">— {promise.author}</p>
      <div className="p-actions">
        <button className="pill">{t("panel.save")}</button>
        <button className="pill">{t("panel.report")}</button>
        <button className="pill">{t("panel.edit")}</button>
        <button className="pill danger" onClick={() => void handleDelete()}>
          {t("panel.delete")}
        </button>
      </div>
    </aside>
  )
}
