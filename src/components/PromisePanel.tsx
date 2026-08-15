import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
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
  const select = useAppStore((s) => s.select)
  const openEdit = useAppStore((s) => s.openEdit)
  const setShareId = useAppStore((s) => s.setShareId)
  const removePromise = useAppStore((s) => s.removePromise)
  const userId = useAppStore((s) => s.userId)
  const profile = useAppStore((s) => s.profile)
  const showToast = useAppStore((s) => s.showToast)
  const queryClient = useQueryClient()
  const categories = useCategories()
  const promise = useAppStore((s) => s.promises.find((p) => p.id === s.selectedId))

  const [reflectOpen, setReflectOpen] = useState(false)
  const [reflText, setReflText] = useState("")

  const isMine = !!userId && !!promise && promise.user_id === userId
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
    if (!promise) return
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
    if (!promise) return
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
    if (!promise) return
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
    if (!promise) return
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
    if (!promise) return
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
    if (!promise) return
    if (!window.confirm(t("panel.delete") + "?")) return
    if (isSupabaseConfigured && userId && isMine) {
      await deletePromise(promise.id)
      await invalidate()
    } else {
      removePromise(promise.id)
    }
  }

  const cat = promise?.category ? categoryLabel(promise.category, lang, categories) : ""

  return (
    <aside id="panel" className={promise ? "open" : ""} aria-label="Promise details">
      {promise && (
        <>
          <div className="p-top">
            <button id="pClose" aria-label="Close panel" onClick={() => select(null)}>
              <svg viewBox="0 0 24 24">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <span className="p-date">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="9" r="3.5" />
                <path d="M12 12.5V20" />
              </svg>
              <span>
                {t("panel.pinned")}{" "}
                {promise.createdAt ? new Date(promise.createdAt).toLocaleDateString() : ""}
              </span>
            </span>
          </div>
          <div id="pCat">{cat.toUpperCase()}</div>
          <div className="p-head">
            <h2 id="pTitle">{promise.text}</h2>
          </div>
          {promise.body && <p id="pBody">{promise.body}</p>}
          <p id="pAuthor">— {promise.author}</p>
          {promise.imageData && <img id="pImage" src={promise.imageData} alt="" />}

          <div className="p-reactions">
            {REACTIONS.map((r) => {
              const active = promise._reacted?.has(r.type) ?? false
              const count = promise._reactionCounts?.[r.type] ?? 0
              return (
                <button
                  key={r.type}
                  className={`reaction-btn ${active ? "on" : ""}`}
                  onClick={() => void onReaction(r.type)}
                >
                  <span>{r.emoji}</span>
                  <i>{count}</i>
                </button>
              )
            })}
          </div>

          <div className="p-actions">
            <button className="pill-btn" onClick={() => setReflectOpen((v) => !v)}>
              <svg viewBox="0 0 24 24">
                <path d="M12 20V9M12 9c0-3.5 2.5-5.5 6-5.5 0 3.5-2.5 5.5-6 5.5z" />
              </svg>
              <span>{t("panel.reflect")}</span>
            </button>
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

          <div id="reflectBox" className={reflectOpen ? "open" : ""}>
            <textarea
              placeholder={t("panel.refl.ph")}
              value={reflText}
              onChange={(e) => setReflText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void onReflect()
                }
              }}
            />
            <button className="send" onClick={() => void onReflect()}>
              <span>{t("panel.addrefl")}</span>
            </button>
          </div>

          <button id="pSave" className={promise._saved ? "saved" : ""} onClick={() => void onSave()}>
            <svg viewBox="0 0 24 24">
              <path d="M7 4h10v16l-5-3.5L7 20z" />
            </svg>
            <span>{promise._saved ? t("panel.saved") : t("panel.save")}</span>
          </button>

          <div id="reflections">
            {(promise._refl ?? []).map((r, i) => (
              <div key={i}>
                <b>{r.who}</b> {r.text}
              </div>
            ))}
          </div>

          <div className="p-foot">
            <button aria-label="Share" onClick={() => setShareId(promise.id)}>
              <svg viewBox="0 0 24 24">
                <path d="M12 3v12" />
                <path d="M7 8l5-5 5 5" />
                <path d="M5 14v6h14v-6" />
              </svg>
              <span>{t("panel.share")}</span>
            </button>
            {isMine && (
              <button id="pEditPromise" aria-label="Edit" onClick={() => openEdit(promise.id)}>
                <svg viewBox="0 0 24 24">
                  <path d="M14.5 4.5l5 5L8 21H3v-5z" />
                  <path d="M12.5 6.5l5 5" />
                </svg>
                <span>{t("panel.edit")}</span>
              </button>
            )}
            <button aria-label="Report" onClick={() => void onReport()}>
              <svg viewBox="0 0 24 24">
                <path d="M6 21V4" />
                <path d="M6 4h12l-2.5 4L18 12H6" />
              </svg>
              <span>{t("panel.report")}</span>
            </button>
            {canDelete && (
              <button id="pDelete" aria-label="Delete" onClick={() => void onDelete()}>
                <svg viewBox="0 0 24 24">
                  <path d="M4 7h16" />
                  <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  <path d="M6 7l1 13h10l1-13" />
                </svg>
                <span>{t("panel.delete")}</span>
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
