/* ============================================================
 * 自研 WebGIS 渲染引擎（Canvas 2D）
 * 不依赖 Mapbox / Leaflet / OSM 等外部地图库，零 key 即可运行
 * 底图：自绘经纬网格（默认）+ 可选天地图影像 / 地形 / 矢量瓦片
 *      + 高德 AMap（真实地图，投影由 AMap 提供，叠加层与之对齐）
 * ============================================================ */

import { wgs2gcj } from './amap'

export type LonLat = [number, number]
export type ScreenXY = [number, number]

export type BasemapType = 'grid' | 'vec' | 'img' | 'ter' | 'amap'

export interface PointStyle {
  /** 半径（像素）或按属性计算 */
  radius: number | ((props: Record<string, unknown>) => number)
  fill: string | ((props: Record<string, unknown>) => string)
  stroke?: string
  lineWidth?: number
  opacity?: number
  /** 是否绘制脉冲动画（用于最新事件） */
  pulse?: boolean | ((props: Record<string, unknown>) => boolean)
}

export interface PointFeature {
  id?: string
  coordinates: LonLat
  properties: Record<string, unknown>
}

export interface LineFeature {
  id?: string
  coordinates: LonLat[]
  properties: Record<string, unknown>
}

export interface PolygonFeature {
  id?: string
  coordinates: LonLat[]
  properties: Record<string, unknown>
}

export interface HeatPoint {
  coordinates: LonLat
  weight: number
}

export interface LayerBase {
  id: string
  visible: boolean
  zIndex: number
}

export interface PointLayer extends LayerBase {
  type: 'point'
  data: PointFeature[]
  style: PointStyle
  labelField?: string
}

export interface LineLayer extends LayerBase {
  type: 'line'
  data: LineFeature[]
  color: string
  width: number
  dash?: number[]
  opacity?: number
}

export interface PolygonLayer extends LayerBase {
  type: 'polygon'
  data: PolygonFeature[]
  fill: string
  stroke: string
  lineWidth: number
  opacity?: number
}

export interface HeatLayer extends LayerBase {
  type: 'heat'
  data: HeatPoint[]
  radius: number
  max: number
  gradient: string[]
}

export type Layer = PointLayer | LineLayer | PolygonLayer | HeatLayer

export interface GisEngineOptions {
  center?: LonLat
  zoom?: number
  minZoom?: number
  maxZoom?: number
  basemap?: BasemapType
  /** 天地图 key，未配置时强制使用网格底图 */
  tiandituKey?: string
  gridColor?: string
  gridLabel?: boolean
}

interface TileRecord {
  img: HTMLImageElement
  loaded: boolean
  failed: boolean
}

const TIANDITU_TYPES: Record<string, string> = {
  vec: 'vec_w',
  img: 'img_w',
  ter: 'ter_w'
}
const TIANDITU_ANNO: Record<string, string> = {
  vec: 'cva_w',
  img: 'cia_w',
  ter: 'cta_w'
}

export class GisEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private opts: Required<GisEngineOptions>

  center: LonLat
  zoom: number
  width = 0
  height = 0
  dpr = 1

  private layers: Layer[] = []
  private tiles = new Map<string, TileRecord>()
  private dragging = false
  private lastXY: ScreenXY = [0, 0]
  private needRender = true
  private rafId = 0
  private pulsePhase = 0
  private destroyed = false

  /** 高德地图实例（amap 模式下作为投影与底图来源） */
  private amapMap: any = null
  private AMapRef: any = null

  /** 外部回调 */
  onHover: ((props: Record<string, unknown> | null, xy: ScreenXY) => void) | null = null
  onClick: ((props: Record<string, unknown> | null) => void) | null = null
  onMove: ((center: LonLat, zoom: number) => void) | null = null

  constructor(canvas: HTMLCanvasElement, options: GisEngineOptions = {}) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文')
    this.ctx = ctx

    this.opts = {
      center: options.center || [102.9, 27.2],
      zoom: options.zoom ?? 8,
      minZoom: options.minZoom ?? 3,
      maxZoom: options.maxZoom ?? 18,
      basemap: options.basemap || 'grid',
      tiandituKey: options.tiandituKey || '',
      gridColor: options.gridColor || 'rgba(91,139,255,.16)',
      gridLabel: options.gridLabel ?? true
    }

    this.center = [...this.opts.center] as LonLat
    this.zoom = this.opts.zoom

    this.bindEvents()
    this.resize()
    this.loop()
  }

  /* ---------------- 投影 ---------------- */
  get worldSize() {
    return 256 * Math.pow(2, this.zoom)
  }

  private lonToWorldX(lon: number) {
    return ((lon + 180) / 360) * this.worldSize
  }

  private latToWorldY(lat: number) {
    const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat))
    const rad = (clamped * Math.PI) / 180
    return (
      ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * this.worldSize
    )
  }

  /** 经纬度 → 屏幕坐标 */
  project(lonlat: LonLat): ScreenXY {
    // amap 模式：直接使用高德投影（需先做 WGS-84 → GCJ-02 偏移修正）
    if (this.amapMap && this.AMapRef) {
      const [glon, glat] = wgs2gcj(lonlat[0], lonlat[1])
      const px = this.amapMap.lngLatToContainer(new this.AMapRef.LngLat(glon, glat))
      return [px.x, px.y]
    }
    const wx = this.lonToWorldX(lonlat[0])
    const wy = this.latToWorldY(lonlat[1])
    const cx = this.lonToWorldX(this.center[0])
    const cy = this.latToWorldY(this.center[1])
    return [wx - cx + this.width / 2, wy - cy + this.height / 2]
  }

  /** 屏幕坐标 → 经纬度 */
  unproject(xy: ScreenXY): LonLat {
    const cx = this.lonToWorldX(this.center[0])
    const cy = this.latToWorldY(this.center[1])
    const wx = xy[0] + cx - this.width / 2
    const wy = xy[1] + cy - this.height / 2
    const lon = (wx / this.worldSize) * 360 - 180
    const n = Math.PI - 2 * Math.PI * (wy / this.worldSize)
    const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
    return [lon, lat]
  }

  /* ---------------- 视图控制 ---------------- */
  setView(center: LonLat, zoom?: number) {
    if (this.amapMap) {
      const [glon, glat] = wgs2gcj(center[0], center[1])
      this.amapMap.setZoomAndCenter(zoom ?? this.amapMap.getZoom(), [glon, glat])
      return
    }
    this.center = [...center] as LonLat
    if (zoom !== undefined) this.zoom = this.clampZoom(zoom)
    this.invalidate()
  }

  flyTo(center: LonLat, zoom?: number, duration = 500) {
    if (this.amapMap) {
      const [glon, glat] = wgs2gcj(center[0], center[1])
      this.amapMap.setZoomAndCenter(zoom ?? this.amapMap.getZoom(), [glon, glat])
      return
    }
    const startC: LonLat = [...this.center] as LonLat
    const startZ = this.zoom
    const endC: LonLat = [...center] as LonLat
    const endZ = zoom === undefined ? this.zoom : this.clampZoom(zoom)
    const t0 = performance.now()

    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / duration)
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      this.center = [startC[0] + (endC[0] - startC[0]) * e, startC[1] + (endC[1] - startC[1]) * e]
      this.zoom = startZ + (endZ - startZ) * e
      this.invalidate()
      if (t < 1 && !this.destroyed) requestAnimationFrame(step)
    }
    step()
  }

  setBasemap(type: BasemapType) {
    this.opts.basemap = type
    this.tiles.clear()
    this.invalidate()
  }

  get basemap() {
    return this.opts.basemap
  }

  /** 接入高德地图：此后投影 / 视图控制 / 底图都由 AMap 提供 */
  setAMap(map: any, AMapRef: any) {
    this.amapMap = map
    this.AMapRef = AMapRef
    this.opts.basemap = 'amap'
    this.resize()
    this.invalidate()
  }

  /** 退出高德模式，回到自绘底图 */
  clearAMap() {
    this.amapMap = null
    this.AMapRef = null
    this.opts.basemap = 'grid'
    this.invalidate()
  }

  /** 是否具备真实瓦片底图能力 */
  get hasTileKey() {
    return !!this.opts.tiandituKey
  }

  private clampZoom(z: number) {
    return Math.max(this.opts.minZoom, Math.min(this.opts.maxZoom, z))
  }

  /* ---------------- 图层 ---------------- */
  setLayers(layers: Layer[]) {
    this.layers = [...layers].sort((a, b) => a.zIndex - b.zIndex)
    this.invalidate()
  }

  /* ---------------- 交互 ---------------- */
  private bindEvents() {
    const c = this.canvas
    c.style.cursor = 'grab'

    c.addEventListener('mousedown', (e) => {
      this.dragging = true
      this.lastXY = [e.offsetX, e.offsetY]
      c.style.cursor = 'grabbing'
    })

    c.addEventListener('mousemove', (e) => {
      const xy: ScreenXY = [e.offsetX, e.offsetY]
      if (this.dragging) {
        const dx = xy[0] - this.lastXY[0]
        const dy = xy[1] - this.lastXY[1]
        // 反向平移中心点的世界坐标，再换算回经纬度
        const cx = this.lonToWorldX(this.center[0]) - dx
        const cy = this.latToWorldY(this.center[1]) - dy
        const lon = (cx / this.worldSize) * 360 - 180
        const n = Math.PI - 2 * Math.PI * (cy / this.worldSize)
        const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
        this.center = [lon, lat]
        this.lastXY = xy
        this.invalidate()
        this.onMove?.(this.center, this.zoom)
      } else {
        this.onHover?.(this.hitTest(xy), xy)
      }
    })

    const endDrag = () => {
      if (!this.dragging) return
      this.dragging = false
      c.style.cursor = 'grab'
    }
    c.addEventListener('mouseup', endDrag)
    c.addEventListener('mouseleave', () => {
      endDrag()
      this.onHover?.(null, [0, 0])
    })

    c.addEventListener('click', (e) => {
      this.onClick?.(this.hitTest([e.offsetX, e.offsetY]))
    })

    c.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        const before = this.unproject([e.offsetX, e.offsetY])
        const delta = -Math.sign(e.deltaY) * 0.4
        const newZoom = this.clampZoom(this.zoom + delta)
        if (newZoom === this.zoom) return
        this.zoom = newZoom
        // 保持鼠标位置对应的经纬度不变
        const after = this.unproject([e.offsetX, e.offsetY])
        this.center = [
          this.center[0] + (before[0] - after[0]),
          this.center[1] + (before[1] - after[1])
        ]
        this.invalidate()
        this.onMove?.(this.center, this.zoom)
      },
      { passive: false }
    )
  }

  private hitTest(xy: ScreenXY): Record<string, unknown> | null {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i]
      if (!layer.visible || layer.type !== 'point') continue
      for (const f of layer.data) {
        const p = this.project(f.coordinates)
        const r = typeof layer.style.radius === 'function'
          ? layer.style.radius(f.properties)
          : layer.style.radius
        const d = Math.hypot(p[0] - xy[0], p[1] - xy[1])
        if (d <= Math.max(r, 6)) return f.properties
      }
    }
    return null
  }

  /** amap 模式下由外部（高德地图事件）传入屏幕像素坐标进行拾取 */
  pickAt(xy: ScreenXY): Record<string, unknown> | null {
    return this.hitTest(xy)
  }

  /* ---------------- 尺寸 ---------------- */
  resize() {
    const rect = this.canvas.parentElement?.getBoundingClientRect()
    const w = rect?.width || this.canvas.width || 600
    const h = rect?.height || this.canvas.height || 400
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.width = w
    this.height = h
    this.canvas.width = Math.round(w * this.dpr)
    this.canvas.height = Math.round(h * this.dpr)
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
    if (this.amapMap?.resize) this.amapMap.resize()
    this.invalidate()
  }

  invalidate() {
    this.needRender = true
  }

  destroy() {
    this.destroyed = true
    cancelAnimationFrame(this.rafId)
    this.tiles.clear()
  }

  /* ---------------- 渲染循环 ---------------- */
  private loop = () => {
    if (this.destroyed) return
    if (this.needRender) {
      this.needRender = false
      this.render()
    }
    // 脉冲动画
    const hasPulse = this.layers.some(
      (l) => l.type === 'point' && l.style.pulse && l.visible
    )
    if (hasPulse) {
      this.pulsePhase = (this.pulsePhase + 0.045) % 1
      this.render()
    }
    this.rafId = requestAnimationFrame(this.loop)
  }

  private render() {
    const ctx = this.ctx
    ctx.save()
    ctx.scale(this.dpr, this.dpr)
    ctx.clearRect(0, 0, this.width, this.height)

    if (this.amapMap) {
      // amap 模式：画布透明，高德底图在下方显示，叠加层仍由本引擎绘制
    } else if (this.opts.basemap !== 'grid' && this.opts.tiandituKey) {
      this.drawTiles()
    } else {
      this.drawGrid()
    }

    for (const layer of this.layers) {
      if (!layer.visible) continue
      if (layer.type === 'heat') this.drawHeat(layer)
      else if (layer.type === 'polygon') this.drawPolygons(layer)
      else if (layer.type === 'line') this.drawLines(layer)
      else if (layer.type === 'point') this.drawPoints(layer)
    }

    ctx.restore()
  }

  /* ---------------- 底图：经纬网格 ---------------- */
  private drawGrid() {
    const ctx = this.ctx
    const g = ctx.createLinearGradient(0, 0, 0, this.height)
    g.addColorStop(0, '#eef2fa')
    g.addColorStop(1, '#e4eaf5')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, this.width, this.height)

    const tl = this.unproject([0, 0])
    const br = this.unproject([this.width, this.height])
    const spanLon = br[0] - tl[0]
    const steps = [10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05, 0.02, 0.01, 0.005]
    const stepLon = steps.find((s) => spanLon / s <= 10) ?? 0.001

    ctx.lineWidth = 1
    ctx.strokeStyle = this.opts.gridColor
    ctx.fillStyle = 'rgba(120,132,158,.75)'
    ctx.font = '11px "JetBrains Mono", monospace'

    const startLon = Math.floor(tl[0] / stepLon) * stepLon
    for (let lon = startLon; lon <= br[0]; lon += stepLon) {
      const x = this.project([lon, 0])[0]
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, this.height)
      ctx.stroke()
      if (this.opts.gridLabel) ctx.fillText(lon.toFixed(stepLon < 0.1 ? 2 : 1) + '°E', x + 4, this.height - 6)
    }

    const startLat = Math.floor(br[1] / stepLon) * stepLon
    for (let lat = startLat; lat <= tl[1]; lat += stepLon) {
      const y = this.project([0, lat])[1]
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(this.width, y)
      ctx.stroke()
      if (this.opts.gridLabel) ctx.fillText(lat.toFixed(stepLon < 0.1 ? 2 : 1) + '°N', 6, y - 5)
    }
  }

  /* ---------------- 底图：天地图瓦片 ---------------- */
  private drawTiles() {
    const ctx = this.ctx
    const z = Math.max(1, Math.min(18, Math.round(this.zoom)))
    const scale = Math.pow(2, this.zoom - z) // z 级瓦片在当前 zoom 下的放大倍数
    const n = Math.pow(2, z)

    // 当前视口左上角的世界坐标（当前 zoom 下）
    const tlX = this.lonToWorldX(this.center[0]) - this.width / 2
    const tlY = this.latToWorldY(this.center[1]) - this.height / 2

    const minX = Math.floor(tlX / scale / 256)
    const maxX = Math.floor((tlX + this.width) / scale / 256)
    const minY = Math.floor(tlY / scale / 256)
    const maxY = Math.floor((tlY + this.height) / scale / 256)

    // 背景底色，避免加载过程中白闪
    ctx.fillStyle = '#eaeef5'
    ctx.fillRect(0, 0, this.width, this.height)

    const drawOne = (tx: number, ty: number, isAnno: boolean) => {
      if (ty < 0 || ty >= n) return
      const wx = ((tx % n) + n) % n
      const key = `${this.opts.basemap}/${isAnno ? 'a' : 'b'}/${z}/${wx}/${ty}`
      let rec = this.tiles.get(key)
      if (!rec) {
        const type = isAnno ? TIANDITU_ANNO[this.opts.basemap] : TIANDITU_TYPES[this.opts.basemap]
        const sub = (wx + ty) % 8
        const url = `https://t${sub}.tianditu.gov.cn/DataServer?T=${type}&x=${wx}&y=${ty}&l=${z}&tk=${this.opts.tiandituKey}`
        const img = new Image()
        img.crossOrigin = 'anonymous'
        rec = { img, loaded: false, failed: false }
        this.tiles.set(key, rec)
        img.onload = () => {
          rec!.loaded = true
          this.invalidate()
        }
        img.onerror = () => {
          rec!.failed = true
        }
        img.src = url
      }
      if (!rec.loaded) return

      // 瓦片在 z 级的世界坐标 → 当前 zoom 的世界坐标 → 屏幕坐标
      const sx = tx * 256 * scale - tlX
      const sy = ty * 256 * scale - tlY
      const size = 256 * scale
      if (sx > this.width || sy > this.height || sx + size < 0 || sy + size < 0) return
      try {
        ctx.drawImage(rec.img, sx, sy, size + 1, size + 1)
      } catch {
        /* 跨域图片绘制失败时忽略 */
      }
    }

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        drawOne(x, y, false)
        drawOne(x, y, true)
      }
    }

    // key 无效时给出提示
    if ([...this.tiles.values()].some((t) => t.failed)) {
      ctx.fillStyle = 'rgba(220,38,38,.9)'
      ctx.font = '12px sans-serif'
      ctx.fillText('底图 key 无效或不可用，请检查配置', 12, 22)
    }
  }

  /* ---------------- 图层绘制 ---------------- */
  private drawPoints(layer: PointLayer) {
    const ctx = this.ctx
    for (const f of layer.data) {
      const [x, y] = this.project(f.coordinates)
      if (x < -50 || y < -50 || x > this.width + 50 || y > this.height + 50) continue

      const r = typeof layer.style.radius === 'function'
        ? layer.style.radius(f.properties)
        : layer.style.radius
      const fill = typeof layer.style.fill === 'function'
        ? layer.style.fill(f.properties)
        : layer.style.fill
      const pulse = typeof layer.style.pulse === 'function'
        ? layer.style.pulse(f.properties)
        : layer.style.pulse

      ctx.globalAlpha = layer.style.opacity ?? 1

      if (pulse) {
        const t = this.pulsePhase
        ctx.beginPath()
        ctx.arc(x, y, r + t * 22, 0, Math.PI * 2)
        ctx.fillStyle = fill
        ctx.globalAlpha = (layer.style.opacity ?? 1) * (1 - t) * 0.5
        ctx.fill()
        ctx.globalAlpha = layer.style.opacity ?? 1
      }

      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = fill
      ctx.fill()
      if (layer.style.stroke) {
        ctx.lineWidth = layer.style.lineWidth ?? 1.5
        ctx.strokeStyle = layer.style.stroke
        ctx.stroke()
      }

      if (layer.labelField && f.properties[layer.labelField]) {
        ctx.font = '11px sans-serif'
        ctx.fillStyle = 'rgba(40,50,70,.9)'
        ctx.fillText(String(f.properties[layer.labelField]), x + r + 4, y + 4)
      }
      ctx.globalAlpha = 1
    }
  }

  private drawLines(layer: LineLayer) {
    const ctx = this.ctx
    ctx.save()
    ctx.globalAlpha = layer.opacity ?? 1
    ctx.strokeStyle = layer.color
    ctx.lineWidth = layer.width
    ctx.lineJoin = 'round'
    if (layer.dash) ctx.setLineDash(layer.dash)
    for (const f of layer.data) {
      if (f.coordinates.length < 2) continue
      ctx.beginPath()
      f.coordinates.forEach((c, i) => {
        const [x, y] = this.project(c)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawPolygons(layer: PolygonLayer) {
    const ctx = this.ctx
    ctx.save()
    ctx.globalAlpha = layer.opacity ?? 1
    for (const f of layer.data) {
      if (f.coordinates.length < 3) continue
      ctx.beginPath()
      f.coordinates.forEach((c, i) => {
        const [x, y] = this.project(c)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.closePath()
      ctx.fillStyle = layer.fill
      ctx.fill()
      ctx.lineWidth = layer.lineWidth
      ctx.strokeStyle = layer.stroke
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawHeat(layer: HeatLayer) {
    const ctx = this.ctx
    const off = document.createElement('canvas')
    off.width = Math.max(1, Math.floor(this.width))
    off.height = Math.max(1, Math.floor(this.height))
    const octx = off.getContext('2d')
    if (!octx) return

    for (const p of layer.data) {
      const [x, y] = this.project(p.coordinates)
      if (x < -100 || y < -100 || x > this.width + 100 || y > this.height + 100) continue
      const alpha = Math.min(1, p.weight / layer.max)
      const g = octx.createRadialGradient(x, y, 0, x, y, layer.radius)
      g.addColorStop(0, `rgba(0,0,0,${alpha * 0.55})`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      octx.fillStyle = g
      octx.beginPath()
      octx.arc(x, y, layer.radius, 0, Math.PI * 2)
      octx.fill()
    }

    // 着色：按灰度映射到渐变色
    const img = octx.getImageData(0, 0, off.width, off.height)
    const data = img.data
    const ramp = buildRamp(layer.gradient)
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      if (!a) continue
      const c = ramp[Math.min(255, a)]
      data[i] = c[0]
      data[i + 1] = c[1]
      data[i + 2] = c[2]
      data[i + 3] = Math.min(255, a * 1.15)
    }
    octx.putImageData(img, 0, 0)
    ctx.drawImage(off, 0, 0, this.width, this.height)
  }
}

/** 构建 256 级颜色查找表 */
function buildRamp(colors: string[]): number[][] {
  const ramp: number[][] = []
  const parse = (hex: string) => {
    const h = hex.replace('#', '')
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16)
    ]
  }
  const cs = colors.map(parse)
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (cs.length - 1)
    const idx = Math.floor(t)
    const frac = t - idx
    const a = cs[idx]
    const b = cs[Math.min(cs.length - 1, idx + 1)]
    ramp.push([
      Math.round(a[0] + (b[0] - a[0]) * frac),
      Math.round(a[1] + (b[1] - a[1]) * frac),
      Math.round(a[2] + (b[2] - a[2]) * frac)
    ])
  }
  return ramp
}
