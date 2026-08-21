import * as THREE from "three"
import { gsap } from "gsap"
import type { PaperKind, PromiseItem } from "../lib/types"

// Match the original three r128 look: treat hex colors as linear (no sRGB→linear
// conversion), which renders brighter/warmer — the newer default darkens the scene.
THREE.ColorManagement.enabled = false
import { makePaperTexture, makePhotoTexture, makeTapeTexture, makeWallTexture, makeWoodTexture } from "./textures"

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

let activeEngine: WallEngine | null = null
export function getActiveEngine(): WallEngine | null {
  return activeEngine
}

const WALL_W = 64
const WALL_H = 40
const ROOM_W = 220
const FLOOR_Y = -21
const WALL_TOP = 62
const ROOM_H = WALL_TOP - FLOOR_Y

const FONTS = [
  "600 40px Caveat",
  "600 40px 'Cormorant Garamond'",
  "400 40px 'Liu Jian Mao Cao'",
  "400 40px 'Ma Shan Zheng'",
]

type Attach = "pin" | "tape" | "clip"
type CardLayout = {
  x: number
  y: number
  w: number
  rot: number
  baseZ: number
  paper: PaperKind
  attach: Attach
  pinColor: number
  font: "hand" | "serif"
  doodle: string
  type: "note" | "photo"
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function seeded(seed: number, a: number, b: number): number {
  const x = Math.sin(seed) * 10000
  return a + (x - Math.floor(x)) * (b - a)
}

function layoutCard(p: PromiseItem, i: number): CardLayout {
  const cols = 5
  const col = i % cols
  const row = Math.floor(i / cols)
  const papers: PaperKind[] = [
    "classic",
    "notebook",
    "graph",
    "pastelPink",
    "pastelPurple",
    "pastelGreen",
    "kraft",
    "torn",
    "parchment",
    "postcard",
    "polaroid",
    "sticky",
    "staff",
  ]
  const attaches: Attach[] = ["pin", "pin", "pin", "tape", "clip"]
  const doodles = ["none", "heart", "star", "sprig", "arrow"]
  const golds = [0x9a7b3f, 0x8a6a33, 0xa8884a, 0x7d5f3a]
  const seed = hash(p.id)
  return {
    x: p.x ?? (col - (cols - 1) / 2) * 9.2 + seeded(seed + 1, -1.2, 1.2),
    y: p.y ?? 7.5 - row * 5.4 + seeded(seed + 2, -0.8, 0.8),
    w: p.w ?? seeded(seed + 3, 3.9, 5.2),
    rot: p.rot ?? seeded(seed + 4, -3, 3),
    baseZ: 0.24,
    paper: p.paper ?? papers[(seed + 5) % papers.length]!,
    attach: (p.attach as Attach) ?? attaches[(seed + 6) % attaches.length]!,
    pinColor: p.pinColor ?? golds[(seed + 7) % golds.length]!,
    font: p.font === "serif" ? "serif" : p.font === "hand" ? "hand" : seeded(seed + 8, 0, 1) < 0.3 ? "serif" : "hand",
    doodle: p.doodle ?? doodles[(seed + 9) % doodles.length]!,
    type: p.imageData || p.photo ? "photo" : "note",
  }
}

function bendGeometry(geo: THREE.PlaneGeometry, w: number, h: number, seed: number) {
  const pos = geo.attributes.position!
  const amp = seeded(seed + 100, 0.05, 0.12)
  const ph = seeded(seed + 101, 0, 6.28)
  const cx = (seeded(seed + 102, 0, 1) < 0.5 ? -1 : 1) * (w / 2)
  const cy = h / 2
  const curl = seeded(seed + 103, 0.1, 0.26)
  const cr = seeded(seed + 104, 1.1, 2) * (w * 0.4)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    let z = amp * Math.sin((x / w) * Math.PI + ph) * 0.6
    const d = Math.hypot(x - cx, y - cy)
    z += curl * Math.exp(-(d * d) / cr)
    pos.setZ(i, z)
  }
  geo.computeVertexNormals()
}

export class WallEngine {
  onSelect: ((id: string | null) => void) | null = null
  onPlace: ((x: number, y: number) => void) | null = null

  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private group = new THREE.Group()
  private cards: THREE.Group[] = []
  private pickables: THREE.Mesh[] = []
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private ndc = new THREE.Vector2()
  private wallPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  private placing: { group: THREE.Group; p: PromiseItem; target: THREE.Vector3; prev: THREE.Vector3 } | null = null
  private placeToken = 0
  private px = 0
  private py = 0
  private sparkles: { pts: THREE.Points; vel: { x: number; y: number; z: number }[]; life: number; geo: THREE.BufferGeometry }[] = []
  private hearts: { sprite: THREE.Sprite; vel: { x: number; y: number; z: number }; life: number }[] = []
  private AC: AudioContext | null = null
  private addAnchor = new THREE.Vector3(1.4, -2.9, 0.6)
  private hintAnchor = new THREE.Vector3(0.5, -4.0, 0.6)
  private proj = new THREE.Vector3()
  private raf = 0
  private disposed = false
  private resizeHandler: () => void
  private dustGeo: THREE.BufferGeometry | null = null
  private dustVelocities: [number, number][] = []
  private last = performance.now()

  // camera drag/zoom state
  private cam = { x: 0, y: 0, z: 40, tx: 0, ty: 0, tz: 40 }
  private downPos: { sx: number; sy: number; cx: number; cy: number } | null = null
  private moved = false
  private hovered: THREE.Group | null = null
  private selected: THREE.Group | null = null
  private pinHead = new THREE.SphereGeometry(0.17, 20, 16)
  private pinShaft = new THREE.CylinderGeometry(0.028, 0.028, 0.4, 10)

  constructor(canvas: HTMLCanvasElement) {
    activeEngine = this
    const w = window.innerWidth
    const h = window.innerHeight

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.04

    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 200)
    this.camera.position.set(0, 0, 40)

    this.scene.background = new THREE.Color("#ddd4c2")
    this.scene.fog = new THREE.Fog(0xd7cdb9, 70, 160)
    this.scene.add(this.group)

    this.buildRoom()
    this.buildDust()
    this.bindInput()

    this.resizeHandler = () => this.resize()
    window.addEventListener("resize", this.resizeHandler)

    this.loop()
  }

  private async loadFonts(sample: string) {
    try {
      await Promise.all(FONTS.map((f) => document.fonts.load(f, sample)))
    } catch {
      /* fonts optional */
    }
  }

  setPromises(promises: PromiseItem[]) {
    void this.rebuild(promises)
  }

  private async rebuild(promises: PromiseItem[]) {
    const selectedId = this.selected ? (this.selected.userData.id as string) : null
    const sample = promises.map((p) => `${p.text} ${p.body ?? ""}`).join(" ")
    await this.loadFonts(sample)

    const next = new Map(promises.map((p) => [p.id, p]))

    // Keep cards whose content is unchanged (reactions/saves/reflections don't
    // affect the card texture), so a data refresh never "shakes" the wall.
    const keep: THREE.Group[] = []
    for (const g of this.cards) {
      const prev = g.userData.p as PromiseItem
      const p = next.get(prev.id)
      if (!p || this.cardContentChanged(prev, p)) {
        this.removeCardGroup(g)
      } else {
        g.userData.p = p
        keep.push(g)
      }
    }
    this.cards = keep
    this.pickables = this.pickables.filter((m) =>
      keep.includes(m.userData.group as THREE.Group),
    )
    if (this.hovered && !keep.includes(this.hovered)) this.hovered = null
    if (this.selected && !keep.includes(this.selected)) this.selected = null

    // Add cards that are new in this batch (photo cards may resolve a frame
    // later once their image loads, so fire-and-forget).
    promises.forEach((p, i) => {
      if (!this.cards.some((g) => g.userData.id === p.id)) void this.buildCard(p, i)
    })

    // Re-apply the selection so a data refresh doesn't drop the card back to
    // the wall or undim the others.
    if (selectedId && this.cards.some((c) => c.userData.id === selectedId)) {
      this.setSelected(selectedId)
    }
  }

  private cardContentChanged(prev: PromiseItem, p: PromiseItem): boolean {
    return (
      prev.text !== p.text ||
      prev.paper !== p.paper ||
      prev.font !== p.font ||
      prev.doodle !== p.doodle ||
      prev.status !== p.status ||
      prev.imageData !== p.imageData ||
      prev.photo !== p.photo
    )
  }

  private removeCardGroup(g: THREE.Group) {
    this.scene.remove(g)
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose()
        const m = o.material as THREE.Material | THREE.Material[]
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m.dispose()
        if (o.customDepthMaterial) o.customDepthMaterial.dispose()
      }
    })
  }

  private loadPhotoImage(src: string): Promise<HTMLImageElement | null> {
    if (!src) return Promise.resolve(null)
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = src
    })
  }

  private async buildCard(p: PromiseItem, i: number): Promise<THREE.Group> {
    const seed = hash(p.id)
    const L = layoutCard(p, i)
    const input = {
      text: p.text,
      paper: L.paper,
      font: L.font,
      doodle: L.doodle,
      status: p.status,
      type: L.type,
      imageData: p.imageData,
      photo: p.photo,
    }
    let tex: THREE.Texture
    let ratio: number
    if (L.type === "photo") {
      const img = await this.loadPhotoImage(p.imageData ?? "")
      const r = makePhotoTexture(input, img)
      tex = r.tex
      ratio = r.ratio
    } else {
      const r = makePaperTexture(input)
      tex = r.tex
      ratio = r.ratio
    }
    const w = L.w
    const h = w * ratio
    const geo = new THREE.PlaneGeometry(w, h, 12, 12)
    bendGeometry(geo, w, h, seed)
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      alphaTest: 0.5,
      roughness: 0.93,
      metalness: 0,
      side: THREE.DoubleSide,
    })
    mat.emissive = new THREE.Color(0xffc98a)
    mat.emissiveIntensity = 0
    const paper = new THREE.Mesh(geo, mat)
    paper.castShadow = true
    paper.receiveShadow = true
    paper.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: tex,
      alphaTest: 0.5,
    })
    const group = new THREE.Group()
    group.add(paper)
    L.baseZ = this.stackZ(L.x, L.y)
    group.position.set(L.x, L.y, L.baseZ)
    group.rotation.z = (L.rot * Math.PI) / 180
    group.userData = {
      id: p.id,
      p,
      paper,
      w,
      h,
      baseZ: L.baseZ,
      lift: 0,
      tLift: 0,
      sc: 1,
      tSc: 1,
      dim: { v: 0 },
      baseRot: (L.rot * Math.PI) / 180,
      phase: seeded(seed + 200, 0, 6.28),
      glow: { v: 0 },
    }
    this.makeAttach(L, h, group)
    paper.userData.group = group
    this.scene.add(group)
    this.cards.push(group)
    this.pickables.push(paper)
    return group
  }

  private makeAttach(L: CardLayout, h: number, group: THREE.Group) {
    if (L.attach === "tape") {
      const tape = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 0.62),
        new THREE.MeshStandardMaterial({
          map: makeTapeTexture(),
          transparent: true,
          opacity: 0.9,
          roughness: 0.8,
          depthWrite: false,
        }),
      )
      tape.material.userData.baseOp = 0.9
      tape.position.set(rnd(-0.3, 0.3), h / 2 - 0.05, 0.1)
      tape.rotation.z = rnd(-0.12, 0.12)
      tape.renderOrder = 2
      group.add(tape)
    } else if (L.attach === "clip") {
      const dark = new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.4, metalness: 0.6 })
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 0.22), dark)
      body.position.set(0, h / 2 + 0.1, 0.14)
      body.castShadow = true
      group.add(body)
      const armMat = new THREE.MeshStandardMaterial({ color: 0xb9b9c0, roughness: 0.3, metalness: 0.85 })
      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), armMat)
        arm.position.set(s * 0.28, h / 2 + 0.45, 0.16)
        arm.rotation.z = s * 0.5
        group.add(arm)
      }
    } else {
      const metal = new THREE.MeshStandardMaterial({ color: L.pinColor, roughness: 0.28, metalness: 0.85 })
      const head = new THREE.Mesh(this.pinHead, metal)
      head.castShadow = true
      head.position.set(rnd(-0.4, 0.4), h / 2 - 0.35, 0.3)
      head.scale.z = 0.75
      const shaft = new THREE.Mesh(
        this.pinShaft,
        new THREE.MeshStandardMaterial({ color: 0x777779, roughness: 0.35, metalness: 0.9 }),
      )
      shaft.rotation.x = Math.PI / 2
      shaft.position.set(head.position.x, head.position.y, 0.12)
      group.add(shaft)
      group.add(head)
      group.userData.pinHead = head
    }
  }

  private stackZ(x: number, y: number) {
    let z = 0.24
    for (const c of this.cards) {
      const q = c.userData
      if (Math.abs(x - q.p.x) < (q.w || 6) * 0.5 + 2.4 && Math.abs(y - q.p.y) < (q.h || 6) * 0.5 + 2.2) {
        z = Math.max(z, (q.baseZ || 0.24) + 0.17)
      }
    }
    return Math.min(z, 1.6)
  }

  private buildRoom() {
    // three r155+ uses physical lighting: diffuse is divided by PI in the BRDF,
    // while the original app (three r128) used legacy lighting without that
    // division. Multiply intensities by PI to restore the original brightness.
    const PI = Math.PI
    this.scene.add(new THREE.HemisphereLight(0xfff4e2, 0x8d7d64, 0.8 * PI))
    const key = new THREE.DirectionalLight(0xfff1dc, 0.95 * PI)
    key.position.set(14, 18, 26)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -40
    key.shadow.camera.right = 40
    key.shadow.camera.top = 26
    key.shadow.camera.bottom = -32
    key.shadow.camera.near = 2
    key.shadow.camera.far = 80
    key.shadow.bias = -0.0006
    key.shadow.radius = 4
    this.scene.add(key)
    const fill = new THREE.PointLight(0xffd9ad, 0.22 * PI, 90)
    fill.decay = 1
    fill.position.set(-18, 4, 20)
    this.scene.add(fill)

    const wallTx = makeWallTexture()
    ;[wallTx.tex, wallTx.bump].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(ROOM_W / WALL_W, ROOM_H / WALL_H)
    })
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_W, ROOM_H),
      new THREE.MeshStandardMaterial({
        map: wallTx.tex,
        bumpMap: wallTx.bump,
        bumpScale: 0.4,
        roughness: 0.96,
        metalness: 0,
      }),
    )
    wall.position.y = (WALL_TOP + FLOOR_Y) / 2
    wall.receiveShadow = true
    this.scene.add(wall)

    const woodTex = makeWoodTexture()
    woodTex.repeat.set(9, 4)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_W, 110),
      new THREE.MeshStandardMaterial({ map: woodTex, color: 0xa8825c, roughness: 0.62, metalness: 0.06 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.set(0, FLOOR_Y, 55)
    floor.receiveShadow = true
    this.scene.add(floor)

    const skirtMat = new THREE.MeshStandardMaterial({ color: 0xe9e1cf, roughness: 0.55, metalness: 0.02 })
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 1.5, 0.55), skirtMat)
    skirt.position.set(0, FLOOR_Y + 0.75, 0.28)
    skirt.castShadow = true
    skirt.receiveShadow = true
    this.scene.add(skirt)
    const skirtCap = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.22, 0.72), skirtMat)
    skirtCap.position.set(0, FLOOR_Y + 1.55, 0.3)
    this.scene.add(skirtCap)

    // soft contact shading (baked AO gradients)
    const gradTex = (vertical: boolean) => {
      const c = document.createElement("canvas")
      c.width = 4
      c.height = 128
      const g = c.getContext("2d")!
      const gr = g.createLinearGradient(0, vertical ? 128 : 0, 0, vertical ? 0 : 128)
      gr.addColorStop(0, "rgba(40,30,18,.34)")
      gr.addColorStop(1, "rgba(40,30,18,0)")
      g.fillStyle = gr
      g.fillRect(0, 0, 4, 128)
      return new THREE.CanvasTexture(c)
    }
    const aoWall = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_W, 4.5),
      new THREE.MeshBasicMaterial({ map: gradTex(true), transparent: true, depthWrite: false }),
    )
    aoWall.position.set(0, FLOOR_Y + 2.25 + 1.6, 0.05)
    this.scene.add(aoWall)
    const aoFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_W, 5),
      new THREE.MeshBasicMaterial({ map: gradTex(true), transparent: true, depthWrite: false }),
    )
    aoFloor.rotation.x = -Math.PI / 2
    aoFloor.position.set(0, FLOOR_Y + 0.02, 2.5 + 0.55)
    this.scene.add(aoFloor)
    const aoTop = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_W, 26),
      new THREE.MeshBasicMaterial({ map: gradTex(false), transparent: true, opacity: 0.5, depthWrite: false }),
    )
    aoTop.position.set(0, WALL_TOP - 13, 0.05)
    this.scene.add(aoTop)

    // warm light shaft ("god ray") from the upper-left, catching the dust
    const rayC = document.createElement("canvas")
    rayC.width = 128
    rayC.height = 512
    const rc = rayC.getContext("2d")!
    const rg = rc.createLinearGradient(0, 0, 128, 0)
    rg.addColorStop(0, "rgba(255,238,205,0)")
    rg.addColorStop(0.5, "rgba(255,240,210,0.20)")
    rg.addColorStop(1, "rgba(255,238,205,0)")
    rc.fillStyle = rg
    rc.fillRect(0, 0, 128, 512)
    const rayTex = new THREE.CanvasTexture(rayC)
    rayTex.colorSpace = THREE.SRGBColorSpace
    const ray = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 62),
      new THREE.MeshBasicMaterial({
        map: rayTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.5,
      }),
    )
    ray.position.set(-20, 28, 12)
    ray.rotation.z = 0.42
    ray.rotation.y = -0.28
    this.scene.add(ray)
  }

  private buildDust() {
    const dustGeo = new THREE.BufferGeometry()
    const dustN = 150
    const dp = new Float32Array(dustN * 3)
    const dv: [number, number][] = []
    for (let i = 0; i < dustN; i++) {
      dp[i * 3] = rnd(-26, 26)
      dp[i * 3 + 1] = rnd(-14, 14)
      dp[i * 3 + 2] = rnd(1, 9)
      dv.push([rnd(-0.05, 0.05), rnd(-0.03, 0.03)])
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3))
    this.dustGeo = dustGeo
    this.dustVelocities = dv
    const dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({ color: 0xfff3dd, size: 0.09, transparent: true, opacity: 0.5, depthWrite: false }),
    )
    this.scene.add(dust)
  }

  private bindInput() {
    const el = this.renderer.domElement
    el.addEventListener("pointermove", this.onPointerMove)
    el.addEventListener("pointerdown", this.onPointerDown)
    window.addEventListener("pointerup", this.onPointerUp)
    el.addEventListener("wheel", this.onWheel, { passive: false })
    el.addEventListener("click", this.onClick)
  }

  private setNDC(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
  }

  private pick(clientX: number, clientY: number): THREE.Group | null {
    this.setNDC(clientX, clientY)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hit = this.raycaster.intersectObjects(this.pickables, false)[0]
    return hit ? (hit.object.userData.group as THREE.Group) : null
  }

  async setPlacing(promise: PromiseItem | null) {
    this.cancelPlacing()
    if (!promise) return
    const token = ++this.placeToken
    const g = await this.buildCard(promise, this.cards.length)
    if (token !== this.placeToken) {
      // Superseded (cancelled or replaced) while the photo loaded — drop the ghost.
      this.removeCardGroup(g)
      return
    }
    const ci = this.cards.indexOf(g)
    if (ci >= 0) this.cards.splice(ci, 1)
    const pi = this.pickables.indexOf(g.userData.paper as THREE.Mesh)
    if (pi >= 0) this.pickables.splice(pi, 1)
    g.position.set(this.cam.x, this.cam.y, 1.6)
    this.placing = {
      group: g,
      p: promise,
      target: new THREE.Vector3(this.cam.x, this.cam.y, 0),
      prev: new THREE.Vector3(this.cam.x, this.cam.y, 0),
    }
    this.renderer.domElement.style.cursor = "crosshair"
  }

  cancelPlacing() {
    this.placeToken++
    if (!this.placing) return
    const g = this.placing.group
    this.scene.remove(g)
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose()
        const m = o.material as THREE.Material | THREE.Material[]
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m.dispose()
        if (o.customDepthMaterial) o.customDepthMaterial.dispose()
      }
    })
    this.placing = null
    this.renderer.domElement.style.cursor = ""
  }

  finalizePlacement(x: number, y: number) {
    if (!this.placing) return
    const g = this.placing.group
    const p = this.placing.p
    this.placing = null
    this.renderer.domElement.style.cursor = ""
    const fx = clamp(x, -WALL_W / 2 + 4, WALL_W / 2 - 4)
    const fy = clamp(y, -WALL_H / 2 + 4, WALL_H / 2 - 4)
    p.x = fx
    p.y = fy
    const finalRot = (rnd(-3, 3) * Math.PI) / 180
    p.rot = (finalRot * 180) / Math.PI
    const baseZ = this.stackZ(fx, fy)
    g.userData.baseZ = baseZ
    const pinHead = g.userData.pinHead as THREE.Mesh | undefined
    const pinMat = pinHead ? (pinHead.material as THREE.MeshStandardMaterial) : null
    const pinZ0 = pinHead ? pinHead.position.z : 0
    if (pinHead && pinMat) {
      pinHead.position.z = 2.2
      pinMat.transparent = true
      pinMat.opacity = 0
    }
    g.userData.baseRot = finalRot
    const commit = () => {
      this.cards.push(g)
      this.pickables.push(g.userData.paper)
      this.sparkleBurst(fx, fy, baseZ + 0.6)
      this.onPlace?.(fx, fy)
    }
    const tl = gsap.timeline({ onComplete: commit })
    tl.to(g.position, { x: fx, y: fy, duration: 0.32, ease: "power2.out" }, 0)
      .to(g.position, { z: baseZ, duration: 0.42, ease: "power3.in", onComplete: () => this.tap(150, 0.09, 0.1) }, 0)
      .to(g.rotation, { x: 0, y: 0, z: finalRot, duration: 0.45, ease: "power2.out" }, 0)
      .to(g.scale, { y: 0.965, duration: 0.09, ease: "power2.in" }, 0.42)
      .to(g.scale, { y: 1, duration: 0.6, ease: "elastic.out(1,.4)" }, 0.51)
    if (pinHead && pinMat) {
      tl.to(pinMat, { opacity: 1, duration: 0.12 }, 0.35)
        .to(pinHead.position, { z: pinZ0, duration: 0.3, ease: "back.in(1.6)", onComplete: () => this.tap(1900, 0.05, 0.09) }, 0.4)
        .fromTo(pinHead.scale, { z: 0.5 }, { z: 0.75, duration: 0.4, ease: "elastic.out(1,.45)" }, 0.7)
    }
  }

  private sparkleBurst(x: number, y: number, z: number) {
    const n = 36
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(n * 3)
    const vel: { x: number; y: number; z: number }[] = []
    for (let i = 0; i < n; i++) {
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
      const a = Math.random() * Math.PI * 2
      const r = 0.4 + Math.random() * 0.9
      vel.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: 0.5 + Math.random() * 1.3 })
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    const mat = new THREE.PointsMaterial({ color: 0xffd98a, size: 0.12, transparent: true, opacity: 1, depthWrite: false })
    const pts = new THREE.Points(geo, mat)
    this.scene.add(pts)
    this.sparkles.push({ pts, vel, life: 1, geo })
  }

  private updateSparkles(dt: number) {
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i]!
      s.life -= dt * 1.6
      const pm = s.pts.material as THREE.PointsMaterial
      if (s.life <= 0) {
        this.scene.remove(s.pts)
        pm.dispose()
        s.geo.dispose()
        this.sparkles.splice(i, 1)
        continue
      }
      pm.opacity = s.life
      const attr = s.geo.getAttribute("position") as THREE.BufferAttribute
      for (let j = 0; j < s.vel.length; j++) {
        const v = s.vel[j]!
        attr.setXYZ(j, attr.getX(j) + v.x * dt, attr.getY(j) + v.y * dt, attr.getZ(j) + v.z * dt)
        v.z -= dt * 2.5
      }
      attr.needsUpdate = true
    }
  }

  /** Spawns a floating heart at the card with the given id (Support celebration). */
  burstHeart(id: string) {
    const g = this.cards.find((c) => c.userData.id === id)
    if (!g) return
    this.spawnHeart(g.position.x, g.position.y, (g.userData.baseZ ?? 0.24) + 1.2)
  }

  private spawnHeart(x: number, y: number, z: number) {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 64
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = "#e0695a"
    ctx.font = "46px 'Segoe UI Symbol', 'Noto Sans Symbols', sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("♥", 32, 34)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
    )
    sprite.position.set(x, y, z)
    sprite.scale.setScalar(1.4)
    this.scene.add(sprite)
    this.hearts.push({
      sprite,
      vel: { x: rnd(-0.3, 0.3), y: rnd(1.2, 2), z: rnd(-0.2, 0.2) },
      life: 1,
    })
  }

  private updateHearts(dt: number) {
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i]!
      h.life -= dt * 0.8
      const mat = h.sprite.material as THREE.SpriteMaterial
      if (h.life <= 0) {
        this.scene.remove(h.sprite)
        mat.map?.dispose()
        mat.dispose()
        this.hearts.splice(i, 1)
        continue
      }
      mat.opacity = h.life
      h.sprite.position.x += h.vel.x * dt
      h.sprite.position.y += h.vel.y * dt
      h.sprite.position.z += h.vel.z * dt
      h.sprite.scale.setScalar(1.4 + (1 - h.life) * 0.5)
    }
  }

  private ensureAudio() {
    if (!this.AC) {
      try {
        this.AC = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      } catch {
        /* audio unavailable */
      }
    }
  }

  private tap(freq: number, dur: number, gain: number) {
    if (!this.AC) return
    const o = this.AC.createOscillator()
    const g = this.AC.createGain()
    o.frequency.value = freq
    o.type = "triangle"
    g.gain.setValueAtTime(gain, this.AC.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, this.AC.currentTime + dur)
    o.connect(g).connect(this.AC.destination)
    o.start()
    o.stop(this.AC.currentTime + dur)
  }

  setSelected(id: string | null) {
    let target: THREE.Group | null = null
    for (const g of this.cards) {
      const u = g.userData
      if (id && g.userData.id === id) {
        target = g
        gsap.to(u.dim, { v: 0, duration: 0.4 })
        // Drop the hover glow so the enlarged card shows its true colors
        // instead of carrying the warm hover highlight.
        gsap.to(u.glow, { v: 0, duration: 0.4 })
        u.tLift = 0.9
        u.tSc = 1.05
      } else {
        gsap.to(u.dim, { v: id ? 0.62 : 0, duration: 0.6, ease: "power2.out" })
        u.tLift = 0
        u.tSc = 1
      }
    }
    this.selected = target
    if (target) {
      // Pan so the card sits just left of the right-hand panel, then zoom in.
      gsap.to(this.cam, {
        tx: clamp(target.position.x + 4.5, -20, 20),
        ty: clamp(target.position.y, -11, 11),
        tz: 19,
        duration: 1.1,
        ease: "power3.inOut",
      })
    } else {
      gsap.to(this.cam, { tz: 40, duration: 0.9, ease: "power3.inOut" })
    }
  }

  private wallPointAt(cx: number, cy: number): THREE.Vector3 | null {
    this.setNDC(cx, cy)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const v = new THREE.Vector3()
    if (!this.raycaster.ray.intersectPlane(this.wallPlane, v)) return null
    return v
  }

  private wallPoint(cx: number, cy: number): { x: number; y: number } | null {
    const v = this.wallPointAt(cx, cy)
    if (!v) return null
    return {
      x: clamp(v.x, -WALL_W / 2 + 4, WALL_W / 2 - 4),
      y: clamp(v.y, -WALL_H / 2 + 4, WALL_H / 2 - 4),
    }
  }

  private onPointerMove = (e: PointerEvent) => {
    this.ndc.x = (e.clientX / window.innerWidth) * 2 - 1
    this.ndc.y = -(e.clientY / window.innerHeight) * 2 + 1
    this.px = e.clientX
    this.py = e.clientY
    if (this.placing) {
      this.renderer.domElement.style.cursor = "crosshair"
      return
    }
    if (this.downPos) {
      const dx = (e.clientX - this.downPos.sx) / window.innerWidth
      const dy = (e.clientY - this.downPos.sy) / window.innerHeight
      this.cam.tx = clamp(this.downPos.cx - dx * this.cam.z * 1.5, -26, 26)
      this.cam.ty = clamp(this.downPos.cy + dy * this.cam.z * 1.0, -14, 14)
      if (Math.hypot(e.clientX - this.downPos.sx, e.clientY - this.downPos.sy) > 3) this.moved = true
      return
    }
    const g = this.pick(e.clientX, e.clientY)
    if (g !== this.hovered) {
      if (this.hovered) {
        this.hovered.userData.tLift = 0
        this.hovered.userData.tSc = 1
        gsap.to(this.hovered.userData.glow, { v: 0, duration: 0.5 })
      }
      this.hovered = g
      if (this.hovered && this.hovered !== this.selected) {
        this.hovered.userData.tLift = 0.5
        this.hovered.userData.tSc = 1.035
        gsap.to(this.hovered.userData.glow, { v: 0.3, duration: 0.4 })
      }
    }
    this.renderer.domElement.style.cursor = g ? "pointer" : ""
  }

  private onPointerDown = (e: PointerEvent) => {
    this.ensureAudio()
    this.downPos = { sx: e.clientX, sy: e.clientY, cx: this.cam.tx, cy: this.cam.ty }
    this.moved = false
  }

  private onPointerUp = () => {
    this.downPos = null
  }

  private onClick = (e: MouseEvent) => {
    if (this.placing) {
      const pt = this.wallPoint(e.clientX, e.clientY)
      if (pt) this.finalizePlacement(pt.x, pt.y)
      return
    }
    if (this.moved) return
    const g = this.pick(e.clientX, e.clientY)
    if (g && g.userData.id) this.onSelect?.(g.userData.id as string)
    else this.onSelect?.(null)
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    this.cam.tz = clamp(this.cam.tz + e.deltaY * 0.02, 15, 46)
  }

  private loop = () => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const now = performance.now()
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    const t = now / 1000
    this.cam.x += (this.cam.tx - this.cam.x) * 0.08
    this.cam.y += (this.cam.ty - this.cam.y) * 0.08
    this.cam.z += (this.cam.tz - this.cam.z) * 0.08
    const breathe = Math.sin(t * 0.35) * 0.18
    this.camera.position.set(this.cam.x, this.cam.y, this.cam.z + breathe)
    this.camera.lookAt(this.cam.x + this.ndc.x * 0.5, this.cam.y + this.ndc.y * 0.35, 0)
    for (const g of this.cards) {
      const u = g.userData
      u.lift += (u.tLift - u.lift) * 0.12
      u.sc += (u.tSc - u.sc) * 0.12
      g.position.z = u.baseZ + u.lift
      g.scale.setScalar(u.sc)
      const isHover = g === this.hovered
      const sway = Math.sin(t * 0.55 + u.phase) * 0.006 + u.lift * 0.02 * Math.sin(t * 2.2 + u.phase)
      g.rotation.z = u.baseRot + sway
      g.rotation.y = isHover ? this.ndc.x * 0.1 : 0
      g.rotation.x = Math.sin(t * 0.4 + u.phase) * 0.004 + u.lift * 0.06 + (isHover ? -this.ndc.y * 0.05 : 0)
      const op = 1 - u.dim.v * 0.72
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const m = o.material as THREE.MeshStandardMaterial
          if (m && m.opacity !== undefined) {
            const base = (m.userData && m.userData.baseOp) || 1
            m.opacity = op * base
            m.transparent = base < 1 || op < 0.999
          }
        }
      })
      const paperMat = u.paper.material as THREE.MeshStandardMaterial
      paperMat.opacity = op
      paperMat.transparent = op < 0.999
      paperMat.emissiveIntensity = u.glow.v + u.lift * 0.05
    }
    // dust drift
    if (this.dustGeo) {
      const pos = this.dustGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < this.dustVelocities.length; i++) {
        const dv = this.dustVelocities[i]!
        let x = pos.getX(i) + dv[0] * dt * 8
        let y = pos.getY(i) + dv[1] * dt * 8 + Math.sin(t + i) * 0.001
        if (x > 27) x = -27
        if (x < -27) x = 27
        if (y > 15) y = -15
        if (y < -15) y = 15
        pos.setX(i, x)
        pos.setY(i, y)
      }
      pos.needsUpdate = true
    }
    // placement preview physics: lag + velocity tilt + edge auto-pan
    if (this.placing) {
      const M = 80
      const sp = 26 * dt * (this.cam.z / 40)
      if (this.px < M) this.cam.tx = clamp(this.cam.tx - sp * (1 - this.px / M), -26, 26)
      if (this.px > window.innerWidth - M) this.cam.tx = clamp(this.cam.tx + sp * (1 - (window.innerWidth - this.px) / M), -26, 26)
      if (this.py < M) this.cam.ty = clamp(this.cam.ty + sp * (1 - this.py / M), -14, 14)
      if (this.py > window.innerHeight - M) this.cam.ty = clamp(this.cam.ty - sp * (1 - (window.innerHeight - this.py) / M), -14, 14)
      const rt = this.wallPointAt(this.px, this.py)
      if (rt) this.placing.target.copy(rt)
      const g = this.placing.group
      const tg = this.placing.target
      const vx = tg.x - this.placing.prev.x
      const vy = tg.y - this.placing.prev.y
      this.placing.prev.lerp(tg, 0.5)
      g.position.x += (tg.x - g.position.x) * 0.14
      g.position.y += (tg.y - g.position.y) * 0.14
      g.position.z = 1.6 + Math.sin(t * 2) * 0.05
      g.rotation.z += (clamp(-vx * 0.35, -0.28, 0.28) - g.rotation.z) * 0.1
      g.rotation.x += (clamp(vy * 0.3, -0.22, 0.22) - g.rotation.x) * 0.1
    }
    // pin celebration sparkles
    this.updateSparkles(dt)
    this.updateHearts(dt)
    // projected UI
    const addBtn = document.getElementById("addBtn")
    if (addBtn) {
      this.proj.copy(this.addAnchor).project(this.camera)
      addBtn.style.left = (this.proj.x * 0.5 + 0.5) * window.innerWidth + "px"
      addBtn.style.top = (-this.proj.y * 0.5 + 0.5) * window.innerHeight + "px"
    }
    const addHint = document.getElementById("addHint")
    if (addHint) {
      this.proj.copy(this.hintAnchor).project(this.camera)
      addHint.style.left = (this.proj.x * 0.5 + 0.5) * window.innerWidth + "px"
      addHint.style.top = (-this.proj.y * 0.5 + 0.5) * window.innerHeight + "px"
    }
    this.renderer.render(this.scene, this.camera)
  }

  private resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    if (!w || !h) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  dispose() {
    if (activeEngine === this) activeEngine = null
    this.disposed = true
    cancelAnimationFrame(this.raf)
    const el = this.renderer.domElement
    el.removeEventListener("pointermove", this.onPointerMove)
    el.removeEventListener("pointerdown", this.onPointerDown)
    window.removeEventListener("pointerup", this.onPointerUp)
    el.removeEventListener("wheel", this.onWheel)
    el.removeEventListener("click", this.onClick)
    window.removeEventListener("resize", this.resizeHandler)
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose()
        const m = o.material as THREE.Material | THREE.Material[]
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m.dispose()
      }
    })
    this.renderer.dispose()
  }
}
