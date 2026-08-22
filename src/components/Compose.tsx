import { useEffect, useMemo, useRef, useState } from "react"
import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { PAPERS } from "../lib/papers"
import { categoryLabel } from "../lib/categories"
import { useCategories } from "../hooks/useCategories"
import { isSupabaseConfigured } from "../lib/supabase"
import { uploadPhoto } from "../lib/api"
import { makePaperBackground, renderNotePreview } from "../engine/textures"
import type { PaperKind, PromiseItem } from "../lib/types"

// Append the "text presentation" variation selector (\uFE0E) so these symbols
// render as monochrome glyphs instead of color emoji on iPad / iOS.
const DOODLES: { key: string; icon: string }[] = [
  { key: "none", icon: "✕\uFE0E" },
  { key: "heart", icon: "♥\uFE0E" },
  { key: "star", icon: "★\uFE0E" },
  { key: "sprig", icon: "✿\uFE0E" },
  { key: "arrow", icon: "➶\uFE0E" },
]

// Broader handwriting ink palette (dark inks for light paper, light inks for the
// dark "Charcoal" paper). Kept as CSS colors so the stroke and swatch match.
const INK_COLORS: { c: string; label: string }[] = [
  { c: "#1a1a1a", label: "Black" },
  { c: "#4a4234", label: "Sepia" },
  { c: "#44507a", label: "Indigo" },
  { c: "#5c4038", label: "Maroon" },
  { c: "#c0392b", label: "Red" },
  { c: "#e07b39", label: "Orange" },
  { c: "#7d5a2a", label: "Gold" },
  { c: "#2e7d32", label: "Green" },
  { c: "#6a3ab2", label: "Violet" },
  { c: "#d8638c", label: "Pink" },
  { c: "#f5f3ee", label: "Bone" },
  { c: "#e9d9c0", label: "Cream" },
]
const INK_SIZES: { v: number; label: string }[] = [
  { v: 2, label: "细" },
  { v: 3, label: "中" },
  { v: 5, label: "粗" },
]

// Card text font options. `family` is what's persisted on the promise's `font`
// field and understood by `drawCardText` ("hand"/"serif" are the legacy keys;
// anything else is a CSS font-family, with 霞鹜文楷 TC as the CJK fallback).
const WEB_FONTS: { key: string; label: string; family: string }[] = [
  { key: "hand", label: "手写 · Caveat", family: "hand" },
  { key: "wenkai", label: "霞鹜文楷", family: "'LXGW WenKai TC', sans-serif" },
  { key: "msz", label: "马善政", family: "'Ma Shan Zheng', 'LXGW WenKai TC', cursive" },
  { key: "ljmc", label: "刘建毛草", family: "'Liu Jian Mao Cao', cursive" },
  { key: "serif", label: "衬线 · Cormorant", family: "serif" },
  { key: "dela", label: "Dela Gothic One", family: "'Dela Gothic One', 'LXGW WenKai TC', sans-serif" },
  { key: "dotgothic", label: "DotGothic16", family: "'DotGothic16', 'LXGW WenKai TC', monospace" },
  { key: "kaisei", label: "Kaisei HarunoUmi", family: "'Kaisei HarunoUmi', 'LXGW WenKai TC', serif" },
  { key: "klee", label: "Klee One", family: "'Klee One', 'LXGW WenKai TC', sans-serif" },
  { key: "marker", label: "LXGW Marker Gothic", family: "'LXGW Marker Gothic', 'LXGW WenKai TC', sans-serif" },
  { key: "tegomin", label: "New Tegomin", family: "'New Tegomin', 'LXGW WenKai TC', serif" },
  { key: "playwrite", label: "Playwrite DE LA Guides", family: "'Playwrite DE LA Guides', cursive" },
  { key: "rampart", label: "Rampart One", family: "'Rampart One', 'LXGW WenKai TC', sans-serif" },
  { key: "stick", label: "Stick", family: "'Stick', 'LXGW WenKai TC', sans-serif" },
  { key: "zcool", label: "ZCOOL XiaoWei", family: "'ZCOOL XiaoWei', 'LXGW WenKai TC', serif" },
  { key: "kurenaido", label: "Zen Kurenaido", family: "'Zen Kurenaido', 'LXGW WenKai TC', sans-serif" },
]

// Preload just the chosen web font so the preview and the pinned card can render
// it immediately (we don't preload all fonts up-front — too many requests).
function preloadFont(family: string): Promise<unknown> {
  const name = family.split(",")[0]!.replace(/['"]/g, "").trim()
  if (!document.fonts) return Promise.resolve()
  return document.fonts.load(`600 40px '${name}', 'LXGW WenKai TC'`).catch(() => {})
}

export function Compose() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const open = useAppStore((s) => s.composeOpen)
  const closeCompose = useAppStore((s) => s.closeCompose)
  const setPlacing = useAppStore((s) => s.setPlacing)
  const userId = useAppStore((s) => s.userId)
  const profile = useAppStore((s) => s.profile)
  const setAuthOpen = useAppStore((s) => s.setAuthOpen)
  const showToast = useAppStore((s) => s.showToast)
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
  const [drawMode, setDrawMode] = useState(false)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [fontKey, setFontKey] = useState("hand")
  const [localFont, setLocalFont] = useState("")
  const [fontTick, setFontTick] = useState(0)

  const pickFont = (f: { key: string; family: string }) => {
    setFontKey(f.key)
    setLocalFont("")
    // Preload the chosen font, then re-render the preview once it's ready.
    void preloadFont(f.family).then(() => setFontTick((x) => x + 1))
  }

  const previewAuthor = profile?.name ?? "You"
  // The card's text font: a custom local font wins, otherwise the selected web font.
  const textFont = localFont.trim() || (WEB_FONTS.find((f) => f.key === fontKey)?.family ?? "hand")
  const editorFont =
    textFont === "hand" ? "var(--hand)" : textFont === "serif" ? "var(--serif)" : textFont
  const ink = PAPERS[paper]?.ink ?? "#3d362c"
  // Live paper surface (paper + author/category tag). Sits behind BOTH the text
  // field and the hand-draw canvas so the region you write on always shows the
  // real paper. Empty once a photo is attached (photo cards use the image).
  const paperBg = useMemo(() => {
    if (photoPreview) return ""
    return makePaperBackground({ paper, author: previewAuthor, category })
  }, [paper, photoPreview, previewAuthor, category])

  // Live exact card preview (renders the real note texture via canvas so the
  // text size/centering matches the pinned card, not a small input field).
  const [previewUrl, setPreviewUrl] = useState("")
  useEffect(() => {
    if (drawMode || photoPreview || !paperBg) return
    let alive = true
    renderNotePreview(paperBg, {
      text,
      paper,
      font: textFont,
      doodle,
      type: "note",
      author: previewAuthor,
      category,
    })
      .then((url) => alive && setPreviewUrl(url))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [text, doodle, textFont, fontTick, paperBg, drawMode, photoPreview])

  const [inkColor, setInkColor] = useState("#4a4234")
  const [inkSize, setInkSize] = useState(3)
  const [drawing, setDrawing] = useState(false)
  const drawRef = useRef<HTMLCanvasElement | null>(null)
  const undoRef = useRef<ImageData[]>([])

  const drawCtx = () => drawRef.current?.getContext("2d") ?? null
  const drawPoint = (e: React.PointerEvent) => {
    const c = drawRef.current!
    const r = c.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) * c.width) / r.width,
      y: ((e.clientY - r.top) * c.height) / r.height,
    }
  }
  const onDrawStart = (e: React.PointerEvent) => {
    // Prevent the browser's touch gestures (iOS text selection / long-press
    // magnifier / scroll) from firing while drawing.
    e.preventDefault()
    const ctx = drawCtx()
    const c = drawRef.current
    if (!ctx || !c) return
    undoRef.current.push(ctx.getImageData(0, 0, c.width, c.height))
    if (undoRef.current.length > 40) undoRef.current.shift()
    setDrawing(true)
    const p = drawPoint(e)
    ctx.strokeStyle = inkColor
    ctx.lineWidth = inkSize
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    c.dataset.last = `${p.x},${p.y}`
  }
  const onDrawMove = (e: React.PointerEvent) => {
    if (!drawing) return
    e.preventDefault()
    const ctx = drawCtx()
    const c = drawRef.current
    if (!ctx || !c) return
    const p = drawPoint(e)
    const parts = (c.dataset.last ?? `${p.x},${p.y}`).split(",").map(Number)
    ctx.beginPath()
    ctx.moveTo(parts[0] ?? p.x, parts[1] ?? p.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    c.dataset.last = `${p.x},${p.y}`
  }
  const onDrawEnd = () => setDrawing(false)
  const onDrawContext = (e: React.MouseEvent) => e.preventDefault()
  const onDrawDrag = (e: React.DragEvent) => e.preventDefault()
  const undoDraw = () => {
    const ctx = drawCtx()
    const c = drawRef.current
    if (!ctx || !c) return
    const last = undoRef.current.pop()
    if (last) ctx.putImageData(last, 0, 0)
  }
  const clearDraw = () => {
    const ctx = drawCtx()
    const c = drawRef.current
    if (!ctx || !c) return
    undoRef.current = []
    ctx.clearRect(0, 0, c.width, c.height)
  }
  const hasDrawing = () => {
    const c = drawRef.current
    const ctx = drawCtx()
    if (!c || !ctx) return false
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    for (let i = 3; i < d.length; i += 4) if ((d[i] ?? 0) > 0) return true
    return false
  }

  useEffect(() => {
    if (!open) return
    setText("")
    setCategory("Self-Growth")
    setPaper("classic")
    setDoodle("none")
    setPhoto(null)
    setPhotoPreview("")
    setError("")
    if (fileRef.current) fileRef.current.value = ""
    // Reset the hand-draw canvas so a new note doesn't inherit the previous
    // drawing.
    if (drawRef.current) {
      const ctx = drawRef.current.getContext("2d")
      if (ctx) ctx.clearRect(0, 0, drawRef.current.width, drawRef.current.height)
    }
    undoRef.current = []
  }, [open])

  // Escape closes the compose dialog (backdrop clicks do NOT, to avoid accidental
  // dismissal on a touch screen).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCompose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, closeCompose])

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
    if (!trimmed && !drawMode) return // typed mode requires text; hand-drawn doesn't
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

    let handwriting: string | undefined
    if (drawMode) {
      if (!hasDrawing()) {
        setError(t("compose.errEmptyDraw"))
        return
      }
      try {
        if (isSupabaseConfigured && userId) {
          const blob = await new Promise<Blob>((res) =>
            drawRef.current!.toBlob((b) => res(b!), "image/png"),
          )
          const file = new File([blob], `handwriting-${Date.now()}.png`, { type: "image/png" })
          handwriting = await uploadPhoto(file, userId)
        } else {
          handwriting = drawRef.current!.toDataURL("image/png")
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        return
      }
    }

    // Cards are never re-edited (no Edit button) — once published, delete and
    // re-post. Always create a fresh promise.
    const promise: PromiseItem = {
      id: `p${Date.now()}`,
      text: trimmed || (drawMode ? t("compose.handwrittenDefault") : ""),
      author: profile?.name ?? "You",
      category,
      paper,
      doodle,
      font: textFont,
      createdAt: Date.now(),
      imageData,
      handwriting,
    }

    setSaving(true)
    try {
      setPlacing(promise)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
      return
    }
    setSaving(false)
    closeCompose()
  }

  return (
    <div
      id="composeWrap"
      className={open ? "open" : ""}
      role="dialog"
      aria-modal="true"
    >
      <div id="compose">
        <div className="compose-head">
          <div>
            <h2>{t("compose.title")}</h2>
            <p className="sub">{t("compose.sub")}</p>
          </div>
          <button id="composeClose" type="button" aria-label={t("compose.close")} onClick={closeCompose}>
            ×
          </button>
        </div>
        <div className="compose-mode">
          <button
            type="button"
            className={`mode-btn ${!drawMode ? "on" : ""}`}
            onClick={() => setDrawMode(false)}
          >
            {t("compose.modeText")}
          </button>
          <button
            type="button"
            className={`mode-btn ${drawMode ? "on" : ""}`}
            onClick={() => setDrawMode(true)}
            disabled={!!photoPreview}
          >
            {t("compose.modeDraw")}
          </button>
        </div>

        {drawMode ? (
          <div className="draw-box">
            <canvas
              ref={drawRef}
              width={512}
              height={590}
              className="draw-canvas"
              style={
                paperBg
                  ? {
                      backgroundImage: `url(${paperBg})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
              onPointerDown={onDrawStart}
              onPointerMove={onDrawMove}
              onPointerUp={onDrawEnd}
              onPointerLeave={onDrawEnd}
              onContextMenu={onDrawContext}
              onDragStart={onDrawDrag}
            />
            <div className="draw-tools">
              <div className="ink-palette">
                {INK_COLORS.map((ic) => (
                  <button
                    key={ic.c}
                    type="button"
                    className={`ink ${inkColor === ic.c ? "on" : ""}`}
                    style={{ background: ic.c }}
                    onClick={() => setInkColor(ic.c)}
                    aria-label={ic.label}
                    title={ic.label}
                  />
                ))}
              </div>
              <div className="ink-meta">
                <div className="sz-group">
                  {INK_SIZES.map((s) => (
                    <button
                      key={s.v}
                      type="button"
                      className={`sz ${inkSize === s.v ? "on" : ""}`}
                      onClick={() => setInkSize(s.v)}
                      aria-label={s.label}
                    >
                      <span className="sz-stroke" style={{ height: Math.max(2, s.v) }} />
                    </button>
                  ))}
                </div>
                <span className="ink-undo-wrap">
                  <button type="button" className="undo-btn" onClick={undoDraw}>{"↩\uFE0E"}</button>
                  <button type="button" onClick={clearDraw}>清空</button>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <label>
              {t("compose.your")} <span className="maxhint">({t("compose.maxChars")})</span>
            </label>
            {previewUrl && (
              <img className="card-preview" src={previewUrl} alt="Card preview" />
            )}
            <textarea
              id="promiseText"
              className="compose-editor"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={200}
              placeholder={t("compose.ph.text")}
              style={{ color: ink, fontFamily: editorFont }}
            />
          </>
        )}

        <label>{t("compose.category")}</label>
        <div className="chips">
          {categories.map((c) => (
            <button
              key={c.key}
              className={`chip ${c.key === category ? "on" : ""}`}
              onClick={() => setCategory(c.key)}
            >
              <span className="chip-ico">{c.icon + "\uFE0E"}</span>
              {categoryLabel(c.key, lang, categories)}
            </button>
          ))}
        </div>

        <div className="appearance-section">
          <button
            className="appearance-head"
            onClick={() => setAppearanceOpen((v) => !v)}
            aria-expanded={appearanceOpen}
          >
            <span className="aph-pill">
              <span className="aph-label">{t("compose.appearance")}</span>
              <svg className="aph-chev" viewBox="0 0 24 24">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </button>
          {appearanceOpen && (
            <div className="appearance-body">
            {!photoPreview && (
              <>
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
              </>
            )}
            {!drawMode && !photoPreview && (
              <>
                <label>{t("compose.font")}</label>
                <div className="web-fonts">
                  {WEB_FONTS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      className={`font-chip ${fontKey === f.key && !localFont.trim() ? "on" : ""}`}
                      onClick={() => pickFont(f)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <input
                  className="local-font"
                  value={localFont}
                  onChange={(e) => setLocalFont(e.target.value)}
                  placeholder={t("compose.localFont")}
                  type="text"
                />
              </>
            )}
            {!photoPreview && !drawMode && (
              <>
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
              </>
            )}
            {!drawMode && (
              <>
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
                {photoPreview && <p className="photo-note">{t("compose.photoCardHint")}</p>}
              </>
            )}
          </div>
        )}
        </div>

        {error && <div className="form-error">{error}</div>}
        <div className="row">
          <button id="cancelBtn" onClick={closeCompose}>
            {t("compose.cancel")}
          </button>
          <button id="placeBtn" onClick={() => void place()} disabled={(!text.trim() && !drawMode) || saving}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="9" r="3.5" />
              <path d="M12 12.5V20" />
            </svg>
            <span>{t("compose.place")}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
