import * as THREE from "three"
import { PAPERS } from "../lib/papers"
import type { PaperKind, PromiseStatus } from "../lib/types"

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

function speckle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  n: number,
  alpha: number,
  dark: boolean,
) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * alpha
    ctx.fillStyle = dark ? `rgba(70,55,35,${a})` : `rgba(255,255,255,${a})`
    ctx.fillRect(Math.random() * w, Math.random() * h, rnd(0.6, 2.2), rnd(0.6, 2.2))
  }
}

function tornPath(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  inset: number,
  rough?: boolean,
) {
  const j = rough ? inset * 0.9 : inset * 0.5
  const pts: [number, number][] = []
  const steps = 14
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    for (let i = 0; i < steps; i++) {
      const t = i / steps
      pts.push([x0 + (x1 - x0) * t + rnd(-j, j), y0 + (y1 - y0) * t + rnd(-j, j)])
    }
  }
  edge(inset, inset, w - inset, inset)
  edge(w - inset, inset, w - inset, h - inset)
  edge(w - inset, h - inset, inset, h - inset)
  edge(inset, h - inset, inset, inset)
  ctx.beginPath()
  ctx.moveTo(pts[0]![0], pts[0]![1])
  for (const p of pts) ctx.lineTo(p[0], p[1])
  ctx.closePath()
}

function isCJK(ch: string) {
  const c = ch.codePointAt(0) ?? 0
  return (
    (c >= 0x2e80 && c <= 0x9fff) ||
    (c >= 0x3040 && c <= 0x30ff) ||
    (c >= 0x3400 && c <= 0x4dbf) ||
    (c >= 0xac00 && c <= 0xd7af) ||
    (c >= 0xf900 && c <= 0xfaff) ||
    (c >= 0xff00 && c <= 0xffef)
  )
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const tokens: string[] = []
  let buf = ""
  const flush = () => {
    if (buf) {
      tokens.push(buf)
      buf = ""
    }
  }
  for (const ch of text) {
    if (ch === "\n") {
      flush()
      tokens.push("\n")
    } else if (ch === " " || ch === "\t") {
      flush()
    } else if (isCJK(ch)) {
      flush()
      tokens.push(ch)
    } else {
      buf += ch
    }
  }
  flush()

  const lines: string[] = []
  let cur = ""
  for (const tk of tokens) {
    if (tk === "\n") {
      if (cur) lines.push(cur)
      cur = ""
      continue
    }
    const join = cur && !isCJK(tk) ? " " : ""
    const candidate = cur + join + tk
    if (ctx.measureText(candidate).width > maxW && cur) {
      lines.push(cur)
      cur = tk
    } else {
      cur = candidate
    }
  }
  if (cur) lines.push(cur)
  return lines
}

const DOODLE_GLYPHS: Record<string, string> = {
  heart: "♥",
  star: "★",
  sprig: "✿",
  arrow: "➶",
}

function drawDoodle(
  ctx: CanvasRenderingContext2D,
  kind: string,
  x: number,
  y: number,
  s: number,
  color: string,
) {
  const glyph = DOODLE_GLYPHS[kind]
  if (!glyph) return
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = color
  ctx.font = `${Math.round(s)}px 'Segoe UI Symbol', 'Noto Sans Symbols', sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(glyph, 0, 0)
  ctx.restore()
}

function drawStatusStamp(
  ctx: CanvasRenderingContext2D,
  status: PromiseStatus,
  W: number,
  H: number,
) {
  ctx.save()
  const cx = W * 0.78
  const cy = H * 0.14
  const r = W * 0.18
  const kept = status === "kept"
  const c1 = kept ? "#5a7a4f" : "#8a8478"
  const c2 = kept ? "rgba(90,122,79,0.14)" : "rgba(138,132,120,0.12)"
  ctx.translate(cx, cy)
  ctx.rotate(-0.2)
  ctx.lineWidth = Math.max(3, r * 0.15)
  ctx.strokeStyle = c1
  ctx.fillStyle = c2
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, 7)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, r - r * 0.18, 0, 7)
  ctx.stroke()
  ctx.fillStyle = c1
  ctx.font = `600 ${r * 0.5}px Caveat, 'Liu Jian Mao Cao', cursive`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(kept ? "KEPT" : "SHELVED", 0, r * 0.05)
  ctx.restore()
}

export type CardTextureInput = {
  text: string
  paper: PaperKind
  font: "hand" | "serif"
  doodle: string
  status?: PromiseStatus
  type: "note" | "photo"
  imageData?: string
  photo?: string
}

export function makePaperTexture(p: CardTextureInput) {
  const def = PAPERS[p.paper] || PAPERS.classic
  const W = 512
  const H = Math.round(W * rnd(1.05, 1.25))
  const c = document.createElement("canvas")
  c.width = W
  c.height = H
  const ctx = c.getContext("2d")!
  ctx.clearRect(0, 0, W, H)
  ctx.save()
  if (def.torn) {
    tornPath(ctx, W, H, 10, def.rough)
    ctx.clip()
  }
  ctx.fillStyle = def.base
  ctx.fillRect(0, 0, W, H)
  if (def.tape) {
    ctx.fillStyle = "rgba(255,255,255,.5)"
    ctx.fillRect(W / 2 - 62, 8, 124, 24)
    ctx.strokeStyle = "rgba(0,0,0,.04)"
    ctx.lineWidth = 1
    ctx.strokeRect(W / 2 - 62, 8, 124, 24)
  }
  for (let i = 0; i < 7; i++) {
    const g = ctx.createRadialGradient(
      Math.random() * W,
      Math.random() * H,
      10,
      Math.random() * W,
      Math.random() * H,
      rnd(90, 240),
    )
    g.addColorStop(0, i % 2 ? "rgba(255,255,255,.10)" : "rgba(120,95,60,.07)")
    g.addColorStop(1, "rgba(0,0,0,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  speckle(ctx, W, H, (900 * def.grain * 10) | 0, def.grain * 0.9, true)
  speckle(ctx, W, H, 500, 0.06, false)
  ctx.strokeStyle = "rgba(110,90,60,.05)"
  for (let i = 0; i < 60; i++) {
    ctx.beginPath()
    const x = Math.random() * W
    const y = Math.random() * H
    ctx.moveTo(x, y)
    ctx.lineTo(x + rnd(-18, 18), y + rnd(-4, 4))
    ctx.stroke()
  }
  if (def.lines === "ruled") {
    ctx.strokeStyle = "rgba(120,140,180,.35)"
    ctx.lineWidth = 1.4
    for (let y = 86; y < H - 30; y += 42) {
      ctx.beginPath()
      ctx.moveTo(26, y)
      ctx.lineTo(W - 20, y)
      ctx.stroke()
    }
    ctx.strokeStyle = "rgba(210,120,110,.4)"
    ctx.beginPath()
    ctx.moveTo(58, 20)
    ctx.lineTo(58, H - 20)
    ctx.stroke()
  } else if (def.lines === "grid") {
    ctx.strokeStyle = "rgba(120,140,120,.22)"
    ctx.lineWidth = 1
    for (let y = 0; y < H; y += 34) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }
    for (let x = 0; x < W; x += 34) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
  } else if (def.lines === "staff") {
    ctx.strokeStyle = "rgba(96,86,120,.26)"
    ctx.lineWidth = 1
    for (let g = 0; g < 4; g++) {
      const top = 66 + g * 96
      for (let i = 0; i < 5; i++) {
        const y = top + i * 8
        ctx.beginPath()
        ctx.moveTo(22, y)
        ctx.lineTo(W - 22, y)
        ctx.stroke()
      }
    }
  }
  if (def.spiral) {
    for (let y = 40; y < H - 20; y += 54) {
      ctx.fillStyle = "rgba(60,50,40,.45)"
      ctx.beginPath()
      ctx.arc(24, y, 7, 0, 7)
      ctx.fill()
      ctx.fillStyle = "rgba(255,255,255,.5)"
      ctx.beginPath()
      ctx.arc(22, y - 2, 6, 0, 7)
      ctx.fill()
    }
  }
  if (def.frame === "postcard") {
    ctx.strokeStyle = "rgba(196,78,64,.5)"
    ctx.lineWidth = 3
    ctx.strokeRect(18, 18, W - 36, H - 36)
    ctx.strokeStyle = "rgba(72,112,164,.5)"
    ctx.lineWidth = 2
    ctx.strokeRect(26, 26, W - 52, H - 52)
    ctx.strokeStyle = "rgba(196,78,64,.6)"
    ctx.lineWidth = 1.5
    ctx.strokeRect(W - 66, 22, 40, 48)
    ctx.fillStyle = "rgba(196,78,64,.08)"
    ctx.fillRect(W - 66, 22, 40, 48)
  } else if (def.frame === "polaroid") {
    ctx.strokeStyle = "rgba(126,116,100,.28)"
    ctx.lineWidth = 1.5
    const m = 16
    ctx.strokeRect(m, m, W - 2 * m, H - 2 * m)
  }
  ctx.strokeStyle = def.burnt ? "rgba(62,40,18,.6)" : "rgba(90,70,45,.22)"
  ctx.lineWidth = def.burnt ? 13 : 8
  if (def.torn) {
    tornPath(ctx, W, H, 12, def.rough)
    ctx.stroke()
  } else {
    ctx.strokeRect(4, 4, W - 8, H - 8)
  }
  const ink = def.ink || "#463a2b"
  const pad = def.spiral ? 62 : 44
  const serif = p.font === "serif"
  let size = serif ? 56 : 52
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  let lines: string[] = []
  for (;;) {
    ctx.font = serif
      ? `600 ${size}px 'Cormorant Garamond', 'Ma Shan Zheng', serif`
      : `600 ${size}px Caveat, 'Liu Jian Mao Cao', cursive`
    lines = wrapText(ctx, p.text, W - pad * 2)
    if (lines.length * size * 1.22 < H * 0.62 || size < 30) break
    size -= 3
  }
  const totalH = lines.length * size * 1.22
  const ty = H / 2 - totalH / 2 + size * 0.6 - H * 0.04
  ctx.fillStyle = ink
  lines.forEach((ln, i) => {
    ctx.save()
    ctx.translate(W / 2 + rnd(-3, 3), ty + i * size * 1.22 + rnd(-2, 2))
    ctx.rotate(rnd(-0.012, 0.012))
    ctx.fillText(ln, 0, 0)
    ctx.restore()
  })
  if (p.doodle && p.doodle !== "none") {
    drawDoodle(ctx, p.doodle, W / 2, ty + lines.length * size * 1.22 + 30, 46, ink + "b3")
  }
  ctx.restore()
  if (p.status && p.status !== "active") {
    drawStatusStamp(ctx, p.status, W, H)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return { tex, ratio: H / W }
}

function drawUserPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  pw: number,
  ph: number,
) {
  const iw = img.width
  const ih = img.height
  const s = Math.max(pw / iw, ph / ih) // fill the photo area (no gap), center-crop overflow
  ctx.drawImage(img, (pw - iw * s) / 2, (ph - ih * s) / 2, iw * s, ih * s)
}

const clampf = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

function applyUserPhoto(
  c2: CanvasRenderingContext2D,
  img: HTMLImageElement,
  pw: number,
  ph: number,
) {
  drawUserPhoto(c2, img, pw, ph)
  const v = c2.createRadialGradient(pw / 2, ph / 2, ph * 0.3, pw / 2, ph / 2, ph * 0.75)
  v.addColorStop(0, "rgba(0,0,0,0)")
  v.addColorStop(1, "rgba(60,45,25,.18)")
  c2.fillStyle = v
  c2.fillRect(0, 0, pw, ph)
  speckle(c2, pw, ph, 400, 0.05, true)
}

export function makePhotoTexture(p: CardTextureInput, img?: HTMLImageElement | null) {
  const W = 512
  const m = 34
  const capH = 86
  const pw = W - m * 2
  // Card ratio scales with the uploaded image so the photo fills without crop/gap.
  let ratio = 1.24
  if (img && img.width) {
    const a = img.height / img.width // >1 portrait, <1 landscape
    ratio = clampf((pw * a + m * 2 + capH) / W, 0.75, 2.2)
  }
  const H = Math.round(W * ratio)
  const c = document.createElement("canvas")
  c.width = W
  c.height = H
  const ctx = c.getContext("2d")!
  ctx.fillStyle = "#faf7f0"
  ctx.fillRect(0, 0, W, H)
  speckle(ctx, W, H, 300, 0.04, true)
  const ph = H - m * 2 - capH
  const photoCtx = (draw: (c2: CanvasRenderingContext2D) => void) => {
    ctx.save()
    ctx.translate(m, m)
    ctx.beginPath()
    ctx.rect(0, 0, pw, ph)
    ctx.clip()
    draw(ctx)
    ctx.restore()
  }
  if (p.photo === "beach") {
    photoCtx((c2) => {
      const g = c2.createLinearGradient(0, 0, 0, ph)
      g.addColorStop(0, "#b9d3d8")
      g.addColorStop(0.55, "#e8ddc4")
      g.addColorStop(1, "#dcc9a3")
      c2.fillStyle = g
      c2.fillRect(0, 0, pw, ph)
      c2.fillStyle = "#7fa8a4"
      c2.fillRect(0, ph * 0.42, pw, ph * 0.2)
      c2.fillStyle = "rgba(255,255,255,.55)"
      for (let i = 0; i < 4; i++) {
        c2.fillRect(rnd(0, pw * 0.5), ph * 0.44 + i * ph * 0.045, rnd(70, 190), 3)
      }
      c2.fillStyle = "#e6d5ae"
      c2.beginPath()
      c2.moveTo(0, ph * 0.62)
      c2.quadraticCurveTo(pw * 0.5, ph * 0.55, pw, ph * 0.66)
      c2.lineTo(pw, ph)
      c2.lineTo(0, ph)
      c2.closePath()
      c2.fill()
    })
  } else {
    photoCtx((c2) => {
      const g = c2.createLinearGradient(0, 0, 0, ph)
      g.addColorStop(0, "#ccd8da")
      g.addColorStop(0.6, "#ece1c6")
      g.addColorStop(1, "#e7dcbe")
      c2.fillStyle = g
      c2.fillRect(0, 0, pw, ph)
      c2.fillStyle = "rgba(245,235,205,.9)"
      c2.beginPath()
      c2.arc(pw * 0.72, ph * 0.24, 34, 0, 7)
      c2.fill()
      const ridge = (base: number, color: string, amp: number) => {
        c2.fillStyle = color
        c2.beginPath()
        c2.moveTo(0, base)
        for (let x = 0; x <= pw; x += 26)
          c2.lineTo(x, base - Math.abs(Math.sin(x * 0.013 + base)) * amp - rnd(0, 8))
        c2.lineTo(pw, ph)
        c2.lineTo(0, ph)
        c2.closePath()
        c2.fill()
      }
      ridge(ph * 0.52, "#8b9385", 60)
      ridge(ph * 0.66, "#5f6a58", 52)
      ridge(ph * 0.82, "#95a06b", 34)
      c2.fillStyle = "#d8cfa6"
      c2.beginPath()
      c2.moveTo(pw * 0.42, ph)
      c2.quadraticCurveTo(pw * 0.5, ph * 0.8, pw * 0.62, ph * 0.72)
      c2.lineTo(pw * 0.66, ph * 0.72)
      c2.quadraticCurveTo(pw * 0.56, ph * 0.82, pw * 0.52, ph)
      c2.closePath()
      c2.fill()
    })
  }
  if (p.imageData) {
    if (img) {
      photoCtx((c2) => {
        c2.clearRect(0, 0, pw, ph)
        applyUserPhoto(c2, img, pw, ph)
      })
    } else {
      const el = new Image()
      el.crossOrigin = "anonymous"
      el.onload = () => {
        photoCtx((c2) => {
          c2.clearRect(0, 0, pw, ph)
          applyUserPhoto(c2, el, pw, ph)
        })
        tex.needsUpdate = true
      }
      el.src = p.imageData
    }
  }
  ctx.strokeStyle = "rgba(90,70,45,.15)"
  ctx.lineWidth = 2
  ctx.strokeRect(m, m, pw, ph)
  if (p.text) {
    const capSize = 30
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = `500 ${capSize}px Caveat, 'Liu Jian Mao Cao', cursive`
    ctx.fillStyle = "#4a4234"
    const capW = W - m * 2 - 10
    let capLines = wrapText(ctx, p.text, capW)
    if (capLines.length > 2) {
      capLines = capLines.slice(0, 2)
      capLines[1] = capLines[1]!.slice(0, -1) + "…"
    }
    const capLh = capSize * 1.2
    const capTop = m + ph + 43 - ((capLines.length - 1) * capLh) / 2
    capLines.forEach((ln, i) => ctx.fillText(ln, W / 2, capTop + i * capLh))
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return { tex, ratio: H / W }
}

export function makeTapeTexture() {
  const c = document.createElement("canvas")
  c.width = 256
  c.height = 96
  const ctx = c.getContext("2d")!
  ctx.clearRect(0, 0, 256, 96)
  ctx.beginPath()
  ctx.moveTo(8, rnd(4, 10))
  for (let y = 8; y <= 88; y += 10) ctx.lineTo(rnd(2, 12), y)
  ctx.lineTo(rnd(244, 254), 88)
  for (let y = 88; y >= 8; y -= 10) ctx.lineTo(rnd(244, 254), y)
  ctx.closePath()
  ctx.fillStyle = "rgba(230,215,180,.92)"
  ctx.fill()
  ctx.clip()
  speckle(ctx, 256, 96, 160, 0.1, true)
  ctx.strokeStyle = "rgba(120,95,60,.12)"
  for (let i = 0; i < 6; i++) {
    const y = rnd(8, 88)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(256, y + rnd(-6, 6))
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function makeWallTexture() {
  const S = 1024
  const c = document.createElement("canvas")
  c.width = c.height = S
  const ctx = c.getContext("2d")!
  ctx.fillStyle = "#cbbfab"
  ctx.fillRect(0, 0, S, S)
  for (let i = 0; i < 26; i++) {
    const bx = Math.random() * S
    const by = Math.random() * S
    const r = rnd(140, 420)
    const col = i % 3 ? "rgba(255,248,232,.10)" : "rgba(120,100,70,.10)"
    for (const ox of [-S, 0, S])
      for (const oy of [-S, 0, S]) {
        const g = ctx.createRadialGradient(bx + ox, by + oy, 20, bx + ox, by + oy, r)
        g.addColorStop(0, col)
        g.addColorStop(1, "rgba(0,0,0,0)")
        ctx.fillStyle = g
        ctx.fillRect(0, 0, S, S)
      }
  }
  speckle(ctx, S, S, 5200, 0.08, true)
  speckle(ctx, S, S, 2600, 0.07, false)
  ctx.strokeStyle = "rgba(90,72,50,.15)"
  ctx.lineWidth = 1
  for (let i = 0; i < 10; i++) {
    let x = rnd(S * 0.2, S * 0.8)
    let y = rnd(S * 0.1, S * 0.6)
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let k = 0; k < 8; k++) {
      x += rnd(-22, 22)
      y += rnd(6, 22)
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  const seam = (x0: number, y0: number, x1: number, y1: number) => {
    ctx.lineCap = "round"
    ctx.strokeStyle = "rgba(80,64,44,.38)"
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    const n = 8
    for (let i = 1; i <= n; i++) {
      const t = i / n
      ctx.lineTo(x0 + (x1 - x0) * t + rnd(-2, 2), y0 + (y1 - y0) * t + rnd(-2, 2))
    }
    ctx.stroke()
    ctx.strokeStyle = "rgba(255,248,230,.30)"
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(x0 + 3, y0 + 4)
    ctx.lineTo(x1 + 3, y1 + 4)
    ctx.stroke()
  }
  const H1 = S * 0.3
  const H2 = S * 0.63
  seam(0, 0, S, 0)
  seam(0, S, S, S)
  seam(0, H1, S, H1)
  seam(0, H2, S, H2)
  seam(S * 0.34, 0, S * 0.34, H1)
  seam(S * 0.7, 0, S * 0.7, H1)
  seam(S * 0.18, H1, S * 0.18, H2)
  seam(S * 0.55, H1, S * 0.55, H2)
  seam(S * 0.86, H1, S * 0.86, H2)
  seam(S * 0.4, H2, S * 0.4, S)
  seam(S * 0.74, H2, S * 0.74, S)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const b = document.createElement("canvas")
  b.width = b.height = S
  const bc = b.getContext("2d")!
  bc.filter = "grayscale(1) contrast(1.25)"
  bc.drawImage(c, 0, 0)
  const bump = new THREE.CanvasTexture(b)
  return { tex, bump }
}

export function makeWoodTexture() {
  const c = document.createElement("canvas")
  c.width = 512
  c.height = 256
  const ctx = c.getContext("2d")!
  ctx.fillStyle = "#a57f55"
  ctx.fillRect(0, 0, 512, 256)
  for (let i = 0; i < 70; i++) {
    ctx.strokeStyle = `rgba(${(60 + Math.random() * 40) | 0},${(42 + Math.random() * 30) | 0},20,${rnd(0.05, 0.2)})`
    ctx.lineWidth = rnd(0.6, 2.4)
    const y = Math.random() * 256
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= 512; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.02 + y) * 4 + rnd(-2, 2))
    ctx.stroke()
  }
  speckle(ctx, 512, 256, 500, 0.08, true)
  const PL = 64
  for (let r = 0; r < 4; r++) {
    ctx.fillStyle = `rgba(${r % 2 ? 255 : 40},${r % 2 ? 230 : 26},${r % 2 ? 190 : 10},${rnd(0.03, 0.07)})`
    ctx.fillRect(0, r * PL, 512, PL)
    ctx.strokeStyle = "rgba(35,22,10,.55)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, r * PL + 0.5)
    ctx.lineTo(512, r * PL + 0.5)
    ctx.stroke()
    const jx = (((r * 197) % 512) + 512) % 512
    ctx.beginPath()
    ctx.moveTo(jx, r * PL)
    ctx.lineTo(jx, r * PL + PL)
    ctx.stroke()
    ctx.strokeStyle = "rgba(255,240,215,.18)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, r * PL + 2)
    ctx.lineTo(512, r * PL + 2)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}
