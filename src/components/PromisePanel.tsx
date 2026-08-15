import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { PAPERS } from "../lib/papers"
import { categoryLabel } from "../lib/categories"
import { useCategories } from "../hooks/useCategories"
import { isSupabaseConfigured } from "../lib/supabase"
import {
  addReaction,
  removeReaction,
  toggleSave,
  addReflection,
  addReport,
  upsertPromise,
  deletePromise,
} from "../lib/api"
import { REACTIONS } from "../lib/reactions"
import type { ReactionType, PromiseStatus } from "../lib/types"
import type { I18nKey } from "../i18n"

const STATUS_LABEL: Record<PromiseStatus, I18nKey> = {
  active: "status.active",
  kept: "status.kept",
  shelved: "status.shelved",
}

export function PromisePanel() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const selectedId = useAppStore((s) => s.selectedId)
  const select = useAppStore((s) => s.select)
  const openEdit = useAppStore((s) => s.openEdit)
  const setShareId = useAppStore((s) => s.setShareId)
  const removePromise = useAppStore((s) => s.removePromise)
  const userId = useAppStore((s) => s.userId)
  const profile = useAppStore((s) => s.profile)
  const showToast = useAppStore((s) => s.showToast)
  const queryClient = useQueryClient()
  const promise = useAppStore((s) => s.promises.find((p) => p.id === s.selectedId))

  const [reflText, setReflText] = useState("")
  const categories = useCategories()

  if (!selectedId || !promise) return null

  const isMine = !!userId && promise.user_id === userId
  const canDelete = !isSupabaseConfigured || isMine
  const paper = PAPERS[promise.paper ?? "classic"]
  const cat = promise.category ? categoryLabel(promise.category, lang, categories) : ""
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
      else await addReaction(promise.id, type, uid)
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

  const onStatus = async (status: PromiseStatus) => {
    const uid = requireAuth()
    if (!uid) return
    try {
      await upsertPromise({ ...promise, status }, uid)
      await invalidate()
      showToast(t(STATUS_LABEL[status]))
    } catch {
      /* noop */
    }
  }

  const onReport = async () => {
    const uid = requireAuth()
    if (!uid) return
    try {
      await addReport(promise.id, uid, profile?.name || "Anonymous", promise.text)
      showToast(t("toast.reported"))
    } catch {
      /* noop */
    }
  }

  const onReflect = async () => {
    const text = reflText.trim()
    if (!text) return
    const uid = requireAuth()
    if (!uid) return
    try {
      await addReflection(promise.id, uid, profile?.name || "Anonymous", text)
      setReflText("")
      await invalidate()
      showToast(t("toast.reflection"))
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

      <div className="reactions">
        {REACTIONS.map((r) => {
          const active = promise._reacted?.has(r.type) ?? false
          const count = promise._reactionCounts?.[r.type] ?? 0
          return (
            <button
              key={r.type}
              className={`reaction ${active ? "on" : ""}`}
              onClick={() => void onReaction(r.type)}
              title={t(r.label)}
            >
              <span className="emoji">{r.emoji}</span>
              <span className="count">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="p-actions">
        <button className={`pill ${promise._saved ? "on" : ""}`} onClick={() => void onSave()}>
          {promise._saved ? t("panel.saved") : t("panel.save")}
        </button>
        <button className="pill" onClick={() => setShareId(promise.id)}>
          {t("panel.share")}
        </button>
        <button className="pill" onClick={() => void onReport()}>
          {t("panel.report")}
        </button>
        {isMine && (
          <button className="pill" onClick={() => openEdit(promise.id)}>
            {t("panel.edit")}
          </button>
        )}
        {canDelete && (
          <button className="pill danger" onClick={() => void onDelete()}>
            {t("panel.delete")}
          </button>
        )}
      </div>

      {isMine && (
        <div className="p-status">
          {(Object.keys(STATUS_LABEL) as PromiseStatus[]).map((s) => (
            <button
              key={s}
              className={`status-btn ${promise.status === s ? "on" : ""}`}
              onClick={() => void onStatus(s)}
            >
              {t(STATUS_LABEL[s])}
            </button>
          ))}
        </div>
      )}

      <div className="refl">
        <h4>{t("panel.reflect")}</h4>
        {(promise._refl ?? []).map((r, i) => (
          <div key={i} className="refl-item">
            <b>{r.who}</b> {r.text}
          </div>
        ))}
        <input
          value={reflText}
          onChange={(e) => setReflText(e.target.value)}
          placeholder={t("panel.refl.ph")}
          onKeyDown={(e) => {
            if (e.key === "Enter") void onReflect()
          }}
        />
      </div>
    </aside>
  )
}
