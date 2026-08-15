import * as THREE from "three"
import { PAPERS } from "../lib/papers"
import type { PromiseItem } from "../lib/types"

const CARD_W = 2.4
const CARD_H = 1.5
const TEX_W = 512
const TEX_H = 320

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
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  const startY = y - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((ln, i) => ctx.fillText(ln, x, startY + i * lineHeight))
}

function makeCardTexture(p: PromiseItem): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = TEX_W
  canvas.height = TEX_H
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("2d context unavailable")

  const paper = PAPERS[p.paper ?? "classic"]
  ctx.fillStyle = paper.base
  roundRect(ctx, 18, 18, TEX_W - 36, TEX_H - 36, 22)
  ctx.fill()
  ctx.strokeStyle = "rgba(0,0,0,0.10)"
  ctx.lineWidth = 2
  roundRect(ctx, 18, 18, TEX_W - 36, TEX_H - 36, 22)
  ctx.stroke()

  ctx.fillStyle = paper.ink
  ctx.font = "600 30px Georgia, 'Caveat', serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  wrapText(ctx, p.text, TEX_W / 2, TEX_H / 2, TEX_W - 96, 40)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export class WallEngine {
  /** Called with the promise id when the user clicks a card. */
  onSelect: ((id: string) => void) | null = null

  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private group = new THREE.Group()
  private cards: THREE.Mesh[] = []
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private raf = 0
  private disposed = false
  private resizeHandler: () => void
  private container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
    const w = container.clientWidth || window.innerWidth
    const h = container.clientHeight || window.innerHeight
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h)
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200)
    this.camera.position.set(0, 0, 24)
    this.camera.lookAt(0, 0, 0)

    this.scene.add(this.group)
    this.buildWall()

    this.renderer.domElement.addEventListener("click", this.onClick)
    this.renderer.domElement.addEventListener("pointermove", this.onPointerMove)
    this.resizeHandler = () => this.resize()
    window.addEventListener("resize", this.resizeHandler)
    this.loop()
  }

  setPromises(promises: PromiseItem[]) {
    for (const card of this.cards) {
      this.group.remove(card)
      const mat = card.material as THREE.MeshBasicMaterial
      mat.map?.dispose()
      mat.dispose()
      card.geometry.dispose()
    }
    this.cards = []

    const cols = 5
    promises.forEach((p, i) => {
      const texture = makeCardTexture(p)
      const geometry = new THREE.PlaneGeometry(CARD_W, CARD_H)
      const material = new THREE.MeshBasicMaterial({ map: texture })
      const mesh = new THREE.Mesh(geometry, material)
      const col = i % cols
      const row = Math.floor(i / cols)
      mesh.position.set(
        (col - (cols - 1) / 2) * 2.7,
        1.6 - row * 1.8,
        (Math.random() - 0.5) * 0.4,
      )
      mesh.userData.id = p.id
      mesh.userData.baseRot = (Math.random() - 0.5) * 0.07
      this.group.add(mesh)
      this.cards.push(mesh)
    })
  }

  private buildWall() {
    const geometry = new THREE.PlaneGeometry(30, 18)
    const material = new THREE.MeshBasicMaterial({ color: 0xefe9df })
    const wall = new THREE.Mesh(geometry, material)
    wall.position.z = -2
    this.group.add(wall)
  }

  private pick(clientX: number, clientY: number): THREE.Mesh | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(this.cards, false)
    return hits.length > 0 ? (hits[0]?.object as THREE.Mesh) : null
  }

  private onClick = (e: MouseEvent) => {
    const mesh = this.pick(e.clientX, e.clientY)
    if (!mesh) return
    const id = mesh.userData.id as string | undefined
    if (id) this.onSelect?.(id)
  }

  private onPointerMove = (e: MouseEvent) => {
    const mesh = this.pick(e.clientX, e.clientY)
    this.renderer.domElement.style.cursor = mesh ? "pointer" : ""
  }

  private loop = () => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const t = performance.now() / 1000
    this.cards.forEach((card, i) => {
      const base = (card.userData.baseRot as number) ?? 0
      card.rotation.z = base + Math.sin(t * 0.5 + i * 1.7) * 0.004
    })
    this.renderer.render(this.scene, this.camera)
  }

  private resize() {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    if (!w || !h) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.renderer.domElement.removeEventListener("click", this.onClick)
    this.renderer.domElement.removeEventListener("pointermove", this.onPointerMove)
    window.removeEventListener("resize", this.resizeHandler)
    for (const card of this.cards) {
      const mat = card.material as THREE.MeshBasicMaterial
      mat.map?.dispose()
      mat.dispose()
      card.geometry.dispose()
    }
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        const mat = obj.material as THREE.Material
        mat.dispose()
      }
    })
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
