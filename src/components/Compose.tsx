import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { PAPERS } from "../lib/papers"
import { categoryLabel } from "../lib/categories"
import { useCategories } from "../hooks/useCategories"
import { isSupabaseConfigured } from "../lib/supabase"
import { upsertPromise, uploadPhoto } from "../lib/api"
import type { PaperKind, PromiseItem } from "../lib/types"

const DOODLES: { key: string; icon: string }[] = [
  { key: "none", icon: "✕" },
  { key: "heart", icon: "♥" },
  { key: "star", icon: "★" },
  { key: "sprig", icon: "✿" },
  { key: "arrow", icon: "➶" },
]

export function Compose() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const open = useAppStore((s) => s.composeOpen)
  const editingId = useAppStore((s) => s.editingId)
  const closeCompose = useAppStore((s) => s.closeCompose)
  const updatePromise = useAppStore((s) => s.updatePromise)
  const setPlacing = useAppStore((s) => s.setPlacing)
  const select = useAppStore((s) => s.select)
  const userId = useAppStore((s) => s.userId)
  const profile = useAppStore((s) => s.profile)
  const setAuthOpen = useAppStore((s) => s.setAuthOpen)
  const showToast = useAppStore((s) => s.showToast)
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const categories = useCategories()

  const [text, setText] = useState("")
  const [category, setCategory] = useState("Self-Growth")
  const [paper, setPaper] = useState<PaperKind>("classic")
  const [doodle, setDoodle] = useState("none")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const editing = editingId
      ? useAppStore.getState().promises.find((p) => p.id === editingId)
      : null
    const draft = useAppStore.getState().draftText
    setText(editing?.text ?? draft ?? "")
    setCategory(editing?.category ?? "Self-Growth")
    setPaper(editing?.paper ?? "classic")
    setDoodle(editing?.doodle ?? "none")
    setPhoto(null)
    setPhotoPreview(editing?.imageData ?? "")
    setError("")
    if (draft) useAppStore.getState().setDraftText(null)
    if (fileRef.current) fileRef.current.value = ""
  }, [open, editingId])

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setPhoto(null)
    setPhotoPreview("")
    if (fileRef.current) fileRef.current.value = ""
  }

  const place = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setError("")

    // Publishing to the cloud backend requires a signed-in account (matches
    // the original app, which blocks anonymous pins instead of silently
    // dropping them).
    if (isSupabaseConfigured && !userId) {
      setAuthOpen(true)
      showToast(t("toast.signinFirst"))
      return
    }

    let imageData: string | undefined = photoPreview || undefined
    if (photo) {
      try {
        imageData =
          isSupabaseConfigured && userId ? await uploadPhoto(photo, userId) : photoPreview
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        return
      }
    }

    const base = editingId
      ? useAppStore.getState().promises.find((p) => p.id === editingId) ?? null
      : null
    const promise: PromiseItem = {
      ...(base ?? {}),
      id: base?.id ?? `p${Date.now()}`,
      text: trimmed,
      author: base?.author ?? profile?.name ?? "You",
      category,
      paper,
      doodle,
      status: base?.status ?? "active",
      createdAt: base?.createdAt ?? Date.now(),
      imageData,
    }

    setSaving(true)
    try {
      if (base) {
        if (isSupabaseConfigured && userId) {
          await upsertPromise(promise, userId)
          await queryClient.invalidateQueries({ queryKey: ["promises"] })
        } else {
          updatePromise(promise)
        }
      } else {
        setPlacing(promise)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
      return
    }
    setSaving(false)
    closeCompose()
    if (base) select(promise.id)
  }

  return (
    <div
      id="composeWrap"
      className={open ? "open" : ""}
      role="dialog"
      aria-modal="true"
      onClick={closeCompose}
    >
      <div id="compose" onClick={(e) => e.stopPropagation()}>
        <h2>{editingId ? t("compose.editTitle") : t("compose.title")}</h2>
        <p className="sub">{t("compose.sub")}</p>
        <label>
          {t("compose.your")} <span className="maxhint">({t("compose.maxChars")})</span>
        </label>
        <textarea
          id="promiseText"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={90}
          placeholder={t("compose.ph.text")}
        />
        <label>{t("compose.category")}</label>
        <div className="chips">
          {categories.map((c) => (
            <button
              key={c.key}
              className={`chip ${c.key === category ? "on" : ""}`}
              onClick={() => setCategory(c.key)}
            >
              {c.icon} {categoryLabel(c.key, lang, categories)}
            </button>
          ))}
        </div>
        <label>{t("compose.paper")}</label>
        <div className="papers">
          {(Object.entries(PAPERS) as [PaperKind, { label: string }][]).map(([key, style]) => (
            <button
              key={key}
              className={`paper-swatch ${key === paper ? "on" : ""}`}
              data-paper={key}
              onClick={() => setPaper(key)}
              title={style.label}
            />
          ))}
        </div>
        <label>{t("compose.photo")}</label>
        <label id="photoDrop" htmlFor="photoInput">
          <svg viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>{t("compose.attach")}</span>
        </label>
        <input id="photoInput" ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        {photoPreview && (
          <div id="photoPreviewWrap">
            <img id="photoPreview" src={photoPreview} alt="Attached photo preview" />
            <button id="photoClear" type="button" aria-label="Remove photo" onClick={removePhoto}>
              ×
            </button>
          </div>
        )}
        <label>{t("compose.decoration")}</label>
        <div className="doodles">
          {DOODLES.map((d) => (
            <button
              key={d.key}
              className={`doodle-btn ${doodle === d.key ? "on" : ""}`}
              onClick={() => setDoodle(d.key)}
              title={d.key}
            >
              {d.icon}
            </button>
          ))}
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="row">
          <button id="cancelBtn" onClick={closeCompose}>
            {t("compose.cancel")}
          </button>
          <button id="placeBtn" onClick={() => void place()} disabled={!text.trim() || saving}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="9" r="3.5" />
              <path d="M12 12.5V20" />
            </svg>
            <span>{editingId ? t("compose.save") : t("compose.place")}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
