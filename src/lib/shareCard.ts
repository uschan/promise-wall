import { PAPERS } from "./papers"
import type { PromiseItem } from "./types"

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const lines: string[] = []
  const hasCJK = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(text)
  if (hasCJK) {
    let line = ""
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxWidth && line) {
        lines.push(line)
        line = ch
      } else {
        line += ch
      }
    }
    if (line) lines.push(line)
  } else {
    const words = text.split(/\s+/)
    let line = ""
    for (const w of words) {
      const cand = line ? `${line} ${w}` : w
      if (ctx.measureText(cand).width > maxWidth && line) {
        lines.push(line)
        line = w
      } else {
        line = cand
      }
    }
    if (line) lines.push(line)
  }
  const startY = y - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((ln, i) => ctx.fillText(ln, x, startY + i * lineHeight))
}

export function drawShareCard(canvas: HTMLCanvasElement, p: PromiseItem) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const paper = PAPERS[p.paper ?? "classic"]
  const w = canvas.width
  const h = canvas.height

  ctx.fillStyle = paper.base
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = "rgba(0,0,0,0.15)"
  ctx.lineWidth = 3
  roundRect(ctx, 20, 20, w - 40, h - 40, 24)
  ctx.stroke()

  ctx.fillStyle = "rgba(0,0,0,0.55)"
  ctx.font = "600 22px Georgia, serif"
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
  ctx.fillText("WishCollective", 60, 72)

  ctx.fillStyle = paper.ink
  ctx.font = "600 44px Georgia, 'Caveat', serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  wrapText(ctx, p.text, w / 2, h / 2, w - 140, 56)

  ctx.textAlign = "right"
  ctx.textBaseline = "alphabetic"
  ctx.fillStyle = "rgba(0,0,0,0.55)"
  ctx.font = "italic 24px Georgia, serif"
  ctx.fillText(`— ${p.author}`, w - 60, h - 62)
}
