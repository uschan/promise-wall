import { useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { PAPERS } from "../lib/papers"
import { DEFAULT_CATEGORIES, categoryLabel } from "../lib/categories"
import { isSupabaseConfigured } from "../lib/supabase"
import { upsertPromise, uploadPhoto } from "../lib/api"
import type { PaperKind, PromiseItem } from "../lib/types"

export function Compose() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const open = useAppStore((s) => s.composeOpen)
  const setComposeOpen = useAppStore((s) => s.setComposeOpen)
  const addPromise = useAppStore((s) => s.addPromise)
  const select = useAppStore((s) => s.select)
  const userId = useAppStore((s) => s.userId)
  const profile = useAppStore((s) => s.profile)
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [text, setText] = useState("")
  const [category, setCategory] = useState("Self-Growth")
  const [paper, setPaper] = useState<PaperKind>("classic")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  if (!open) return null

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

    let imageData: string | undefined
    if (photo) {
      try {
        imageData =
          isSupabaseConfigured && userId
            ? await uploadPhoto(photo, userId)
            : photoPreview
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        return
      }
    }

    const promise: PromiseItem = {
      id: `p${Date.now()}`,
      text: trimmed,
      author: profile?.name || "You",
      category,
      paper,
      status: "active",
      createdAt: Date.now(),
      imageData,
    }

    setSaving(true)
    try {
      if (isSupabaseConfigured && userId) {
        await upsertPromise(promise, userId)
        await queryClient.invalidateQueries({ queryKey: ["promises"] })
      } else {
        addPromise(promise)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
      return
    }
    setSaving(false)
    setComposeOpen(false)
    setText("")
    removePhoto()
    select(promise.id)
  }

  return (
    <div className="overlay" onClick={() => setComposeOpen(false)}>
      <div className="compose" onClick={(e) => e.stopPropagation()}>
        <h2>{t("compose.title")}</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("compose.your")}
          maxLength={90}
        />
        <div className="field-label">{t("compose.category")}</div>
        <div className="chips">
          {DEFAULT_CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`chip ${c.key === category ? "on" : ""}`}
              onClick={() => setCategory(c.key)}
            >
              {c.icon} {categoryLabel(c.key, lang)}
            </button>
          ))}
        </div>
        <div className="field-label">{t("compose.paper")}</div>
        <div className="papers">
          {(Object.entries(PAPERS) as [PaperKind, { label: string; base: string }][]).map(
            ([key, style]) => (
              <button
                key={key}
                className={`paper-swatch ${key === paper ? "on" : ""}`}
                style={{ background: style.base }}
                onClick={() => setPaper(key)}
                aria-label={style.label}
                title={style.label}
              />
            ),
          )}
        </div>
        <div className="field-label">{t("compose.photo")}</div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        <button className="pill" onClick={() => fileRef.current?.click()}>
          {t("compose.attach")}
        </button>
        {photoPreview && (
          <div className="photo-preview">
            <img src={photoPreview} alt="" />
            <button className="photo-remove" onClick={removePhoto} aria-label="Remove">
              ×
            </button>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="compose-actions">
          <button className="pill" onClick={() => setComposeOpen(false)}>
            {t("compose.cancel")}
          </button>
          <button className="pill primary" onClick={() => void place()} disabled={!text.trim() || saving}>
            {t("compose.place")}
          </button>
        </div>
      </div>
    </div>
  )
}
