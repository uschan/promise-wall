import { useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { isSupabaseConfigured } from "../lib/supabase"
import { addReaction, removeReaction, toggleSave, deletePromise } from "../lib/api"
import { getActiveEngine } from "../engine/WallEngine"
import type { ReactionType } from "../lib/types"

/**
 * On-card action bar rendered under the enlarged (selected) promise card.
 * Support + Save for everyone; Edit + Delete only for your own cards.
 */
export function CardActions() {
  const t = useT()
  const removePromise = useAppStore((s) => s.removePromise)
  const userId = useAppStore((s) => s.userId)
  const showToast = useAppStore((s) => s.showToast)
  const queryClient = useQueryClient()
  const promise = useAppStore((s) => s.promises.find((p) => p.id === s.selectedId))

  if (!promise) return null

  const isMine = !!userId && promise.user_id === userId
  const canDelete = !isSupabaseConfigured || isMine
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["promises"] })

  const requireAuth = (): string | null => {
    if (!userId) {
      showToast(t("toast.signinFirst"))
      return null
    }
    return userId
  }

  const onReaction = async (type: ReactionType) => {
    const uid = requireAuth()
    if (!uid) return
    const active = promise._reacted?.has(type) ?? false
    try {
      if (active) await removeReaction(promise.id, type, uid)
      else {
        await addReaction(promise.id, type, uid)
        if (type === "heart") getActiveEngine()?.burstHeart(promise.id)
      }
      await invalidate()
    } catch {
      /* noop */
    }
  }

  const onSave = async () => {
    const uid = requireAuth()
    if (!uid) return
    const active = promise._saved ?? false
    try {
      await toggleSave(promise.id, uid, active)
      await invalidate()
      showToast(active ? t("toast.unsaved") : t("toast.saved"))
    } catch {
      /* noop */
    }
  }

  const onDelete = async () => {
    if (!window.confirm(t("panel.delete") + "?")) return
    if (isSupabaseConfigured && userId && isMine) {
      await deletePromise(promise.id)
      await invalidate()
    } else {
      removePromise(promise.id)
    }
  }

  const hearted = promise._reacted?.has("heart") ?? false

  return (
    <div id="cardActions">
      <button
        className={`ca heart ${hearted ? "on" : ""}`}
        aria-label={t("panel.support")}
        onClick={() => void onReaction("heart")}
      >
        <svg viewBox="0 0 24 24">
          <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
        </svg>
        <span className="cnt">{promise.support ?? 0}</span>
      </button>
      <button
        className={`ca save ${promise._saved ? "on" : ""}`}
        aria-label={t("panel.save")}
        onClick={() => void onSave()}
      >
        <svg viewBox="0 0 24 24">
          <path d="M7 4h10v16l-5-3.5L7 20z" />
        </svg>
        <span className="cnt">{promise.saves ?? 0}</span>
      </button>
      {canDelete && (
        <button className="ca del" aria-label={t("panel.delete")} onClick={() => void onDelete()}>
          <svg viewBox="0 0 24 24">
            <path d="M4 7h16" />
            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            <path d="M6 7l1 13h10l1-13" />
          </svg>
        </button>
      )}
    </div>
  )
}
