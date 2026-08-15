import * as THREE from "three"
import { gsap } from "gsap"
import type { PaperKind, PromiseItem } from "../lib/types"
import { makePaperTexture, makePhotoTexture, makeTapeTexture, makeWallTexture, makeWoodTexture } from "./textures"

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

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
  const papers: PaperKind[] = ["classic", "notebook", "graph", "pastelPink", "pastelPurple", "pastelGreen", "kraft", "torn"]
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

function bendGeometry(geo: THREE.PlaneGeometry, w: number, h: number) {
  const pos = geo.attributes.position!
  const amp = rnd(0.05, 0.12)
  const ph = rnd(0, 6.28)
  const cx = ((Math.random() < 0.5 ? -1 : 1) * w) / 2
  const cy = h / 2
  const curl = rnd(0.1, 0.26)
  const cr = rnd(1.1, 2) * (w * 0.4)
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
  onSelect: ((id: string) => void) | null = null
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
  private placing = false
  private raf = 0
  private disposed = false
  private resizeHandler: () => void
  private dustGeo: THREE.BufferGeometry | null = null
  private dustVelocities: [number, number][] = []
  private last = performance.now()

  // camera drag/zoom state
  private cam = { x: 0, y: 0, z: 34, tx: 0, ty: 0, tz: 34 }
  private downPos: { sx: number; sy: number; cx: number; cy: number } | null = null
  private hovered: THREE.Group | null = null
  private pinHead = new THREE.SphereGeometry(0.17, 20, 16)
  private pinShaft = new THREE.CylinderGeometry(0.028, 0.028, 0.4, 10)

  constructor(canvas: HTMLCanvasElement) {
    const w = window.innerWidth
    const h = window.innerHeight

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.04

    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 200)
    this.camera.position.set(0, 0, 34)

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
    const sample = promises.map((p) => `${p.text} ${p.body ?? ""}`).join(" ")
    await this.loadFonts(sample)
    for (const g of this.cards) {
      this.group.remove(g)
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
    this.cards = []
    this.pickables = []
    promises.forEach((p, i) => this.buildCard(p, i))
  }

  private buildCard(p: PromiseItem, i: number) {
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
    const { tex, ratio } = L.type === "photo" ? makePhotoTexture(input) : makePaperTexture(input)
    const w = L.w
    const h = w * ratio
    const geo = new THREE.PlaneGeometry(w, h, 12, 12)
    bendGeometry(geo, w, h)
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
    this.makeAttach(L, h, group)
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
      phase: rnd(0, 6.28),
      glow: { v: 0 },
    }
    paper.userData.group = group
    this.scene.add(group)
    this.cards.push(group)
    this.pickables.push(paper)
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
      tape.position.set(rnd(-0.3, 0.3), h / 2 - 0.05, 0.1)
      tape.rotation.z = rnd(-0.12, 0.12)
      group.add(tape)
    } else if (L.attach === "clip") {
      const dark = new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.4, metalness: 0.6 })
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 0.22), dark)
      body.position.set(0, h / 2 + 0.1, 0.14)
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
    this.scene.add(new THREE.HemisphereLight(0xfff4e2, 0x8d7d64, 0.8))
    const key = new THREE.DirectionalLight(0xfff1dc, 0.95)
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
    const fill = new THREE.PointLight(0xffd9ad, 0.22, 90)
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
  }

  private buildDust() {
    const dustGeo = new THREE.BufferGeometry()
    const dustN = 110
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
      new THREE.PointsMaterial({ color: 0xfff3dd, size: 0.07, transparent: true, opacity: 0.35, depthWrite: false }),
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

  setPlacing(v: boolean) {
    this.placing = v
    this.renderer.domElement.style.cursor = v ? "crosshair" : ""
  }

  setSelected(id: string | null) {
    for (const g of this.cards) {
      const u = g.userData
      if (id && g.userData.id === id) {
        gsap.to(u.dim, { v: 0, duration: 0.4 })
        u.tLift = 0.9
        u.tSc = 1.05
      } else {
        gsap.to(u.dim, { v: id ? 0.62 : 0, duration: 0.6, ease: "power2.out" })
        u.tLift = 0
        u.tSc = 1
      }
    }
  }

  private wallPoint(cx: number, cy: number): { x: number; y: number } | null {
    this.setNDC(cx, cy)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const v = new THREE.Vector3()
    if (!this.raycaster.ray.intersectPlane(this.wallPlane, v)) return null
    return {
      x: clamp(v.x, -WALL_W / 2 + 4, WALL_W / 2 - 4),
      y: clamp(v.y, -WALL_H / 2 + 4, WALL_H / 2 - 4),
    }
  }

  private onPointerMove = (e: PointerEvent) => {
    this.ndc.x = (e.clientX / window.innerWidth) * 2 - 1
    this.ndc.y = -(e.clientY / window.innerHeight) * 2 + 1
    if (this.placing) {
      this.renderer.domElement.style.cursor = "crosshair"
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
      if (this.hovered) {
        this.hovered.userData.tLift = 0.5
        this.hovered.userData.tSc = 1.035
        gsap.to(this.hovered.userData.glow, { v: 0.3, duration: 0.4 })
      }
    }
    this.renderer.domElement.style.cursor = g ? "pointer" : ""
  }

  private onPointerDown = (e: PointerEvent) => {
    this.downPos = { sx: e.clientX, sy: e.clientY, cx: this.cam.tx, cy: this.cam.ty }
  }

  private onPointerUp = () => {
    this.downPos = null
  }

  private onClick = (e: MouseEvent) => {
    if (this.placing) {
      const pt = this.wallPoint(e.clientX, e.clientY)
      if (pt) {
        this.placing = false
        this.onPlace?.(pt.x, pt.y)
      }
      return
    }
    if (this.downPos) return
    const g = this.pick(e.clientX, e.clientY)
    if (g && g.userData.id) this.onSelect?.(g.userData.id as string)
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
    this.camera.position.set(this.cam.x, this.cam.y, this.cam.z)
    this.camera.lookAt(this.cam.x + this.ndc.x * 0.5, this.cam.y + this.ndc.y * 0.35, 0)
    for (const g of this.cards) {
      const u = g.userData
      u.lift += (u.tLift - u.lift) * 0.12
      u.sc += (u.tSc - u.sc) * 0.12
      g.position.z = u.baseZ + u.lift
      g.scale.setScalar(u.sc)
      const sway = Math.sin(t * 0.55 + u.phase) * 0.006 + u.lift * 0.02 * Math.sin(t * 2.2 + u.phase)
      g.rotation.z = u.baseRot + sway
      g.rotation.x = Math.sin(t * 0.4 + u.phase) * 0.004 + u.lift * 0.06
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
