/* ============================================================
 * WebGIS 演示数据（确定性伪随机生成，刷新结果一致）
 * 研究区：金沙江下游水库区（示例数据，仅用于功能演示）
 * ============================================================ */
import type { LonLat } from '@/gis/engine'

/** mulberry32：轻量确定性 PRNG */
function prng(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box-Muller 正态分布 */
function gauss(rnd: () => number, mean = 0, std = 1) {
  const u = Math.max(1e-9, rnd())
  const v = rnd()
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export const REGION = {
  name: '金沙江下游水库区',
  center: [102.92, 27.18] as LonLat,
  zoom: 8.4,
  bounds: { minLon: 102.2, maxLon: 103.7, minLat: 26.6, maxLat: 27.8 }
}

export interface Station {
  id: string
  name: string
  lon: number
  lat: number
  elevation: number
  type: '宽频带' | '短周期' | '强震' | 'GNSS'
  status: '正常' | '维护' | '离线'
  since: string
}

export interface EqEvent {
  id: string
  lon: number
  lat: number
  mag: number
  depth: number
  time: number
  location: string
  /** 定位质量 */
  quality: 'A' | 'B' | 'C'
}

export interface TaskItem {
  id: string
  name: string
  type: string
  status: 'running' | 'queued' | 'success' | 'failed'
  progress: number
  submitAt: number
  cost: string
  node: string
}

/* ---------------- 台站 ---------------- */
const STATION_NAMES = [
  '白鹤滩', '葫芦口', '宁南', '巧家', '会东', '金阳', '布拖', '昭觉',
  '永善', '雷波', '美姑', '昭通', '鲁甸', '会泽', '东川', '禄劝',
  '武定', '元谋', '永仁', '攀枝花'
]

export const stations: Station[] = (() => {
  const rnd = prng(20240915)
  const types: Station['type'][] = ['宽频带', '短周期', '强震', 'GNSS']
  return STATION_NAMES.map((name, i) => {
    const angle = (i / STATION_NAMES.length) * Math.PI * 2
    const r = 0.12 + rnd() * 0.22
    const lon = REGION.center[0] + Math.cos(angle) * r * 1.15
    const lat = REGION.center[1] + Math.sin(angle) * r * 0.85
    const roll = rnd()
    return {
      id: 'ST' + String(i + 1).padStart(3, '0'),
      name: name + '台',
      lon: Number(lon.toFixed(4)),
      lat: Number(lat.toFixed(4)),
      elevation: Math.round(600 + rnd() * 2400),
      type: types[i % types.length],
      status: roll > 0.92 ? '离线' : roll > 0.82 ? '维护' : '正常',
      since: `202${2 + (i % 4)}.0${1 + (i % 9)}`
    }
  })
})()

/* ---------------- 地震事件 ---------------- */
const LOCATION_POOL = [
  '四川省凉山州宁南县', '四川省凉山州金阳县', '四川省凉山州布拖县',
  '云南省昭通市巧家县', '云南省昭通市永善县', '四川省宜宾市屏山县',
  '云南省昆明市东川区', '四川省凉山州会东县', '云南省楚雄州元谋县'
]

function magClass(m: number) {
  if (m >= 3.0) return 'high'
  if (m >= 2.0) return 'mid'
  return 'low'
}

export const events: EqEvent[] = (() => {
  const rnd = prng(880712)
  const list: EqEvent[] = []
  const start = new Date('2024-01-01T00:00:00').getTime()
  const end = new Date('2026-08-31T23:59:59').getTime()
  const N = 420

  for (let i = 0; i < N; i++) {
    // 震级服从 G-R 关系：小震远多于大震
    const u = rnd()
    const mag = Number((0.4 + Math.pow(u, 3.2) * 3.9).toFixed(1))
    // 空间上围绕水库区聚集
    const lon = Number((REGION.center[0] + gauss(rnd, 0, 0.19) * 1.2).toFixed(4))
    const lat = Number((REGION.center[1] + gauss(rnd, 0, 0.15)).toFixed(4))
    const depth = Number(Math.max(0.5, gauss(rnd, 8.5, 4.2)).toFixed(1))
    const time = Math.round(start + rnd() * (end - start))
    list.push({
      id: 'EQ' + String(i + 1).padStart(4, '0'),
      lon,
      lat,
      mag,
      depth,
      time,
      location: LOCATION_POOL[Math.floor(rnd() * LOCATION_POOL.length)],
      quality: mag >= 2.5 ? 'A' : mag >= 1.5 ? 'B' : 'C'
    })
  }
  return list.sort((a, b) => b.time - a.time)
})()

export const latestEvent = events[0]

/** 震级配色 */
export const MAG_COLORS: Record<string, string> = {
  high: '#e8534a',
  mid: '#f6a04d',
  low: '#5b8bff'
}

export function magColor(m: number) {
  return MAG_COLORS[magClass(m)]
}

export function magRadius(m: number) {
  return Math.max(2.6, Math.pow(m, 1.85) * 1.5)
}

/* ---------------- 水库面 ---------------- */
export const reservoir: LonLat[] = (() => {
  const rnd = prng(31415)
  const pts: LonLat[] = []
  const cx = REGION.center[0]
  const cy = REGION.center[1] + 0.06
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2
    const r = 0.075 + rnd() * 0.035
    pts.push([Number((cx + Math.cos(a) * r * 1.7).toFixed(4)), Number((cy + Math.sin(a) * r * 0.75).toFixed(4))])
  }
  return pts
})()

/* ---------------- 断层线 ---------------- */
export const faults: Array<{ name: string; coords: LonLat[] }> = [
  {
    name: '小江断裂带',
    coords: [
      [102.62, 26.72], [102.78, 26.95], [102.95, 27.16], [103.11, 27.38], [103.29, 27.6]
    ]
  },
  {
    name: '则木河断裂',
    coords: [[102.5, 27.42], [102.72, 27.33], [102.94, 27.24], [103.16, 27.19]]
  },
  {
    name: '大凉山断裂',
    coords: [[103.02, 26.92], [103.2, 27.2], [103.34, 27.5], [103.46, 27.74]]
  }
]

/* ---------------- 水位时序（与地震活动关联分析） ---------------- */
export interface WaterLevelPoint {
  date: string
  level: number
  count: number
  maxMag: number
}

export const waterLevelSeries: WaterLevelPoint[] = (() => {
  const rnd = prng(95127)
  const out: WaterLevelPoint[] = []
  const start = new Date('2024-01-01')
  for (let i = 0; i < 32; i++) {
    const d = new Date(start)
    d.setMonth(d.getMonth() + i)
    // 水位呈年度周期性涨落
    const phase = (d.getMonth() / 12) * Math.PI * 2
    const level = 765 + Math.sin(phase - 1.1) * 42 + gauss(rnd, 0, 4)
    // 地震频次与水位变化率弱相关 + 随机
    const rate = Math.cos(phase - 1.1)
    const count = Math.max(2, Math.round(11 + rate * 6 + gauss(rnd, 0, 4)))
    const maxMag = Number((1.2 + rnd() * 2.4 + (rate > 0 ? 0.35 : 0)).toFixed(1))
    out.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      level: Number(level.toFixed(1)),
      count,
      maxMag
    })
  }
  return out
})()

/* ---------------- b 值分析 ---------------- */
export interface BValueStage {
  key: string
  name: string
  bValue: number
  aValue: number
  count: number
  r2: number
  level: number
}

export const bValueStages: BValueStage[] = [
  { key: 'pre', name: '蓄水前', bValue: 0.86, aValue: 4.12, count: 386, r2: 0.982, level: 0 },
  { key: 'b135', name: '135m 蓄水位', bValue: 0.94, aValue: 4.38, count: 512, r2: 0.976, level: 135 },
  { key: 'b156', name: '156m 蓄水位', bValue: 1.04, aValue: 4.71, count: 648, r2: 0.968, level: 156 },
  { key: 'b175', name: '175m 蓄水位', bValue: 1.12, aValue: 4.95, count: 731, r2: 0.971, level: 175 }
]

/* ---------------- 速度结构（成像结果） ---------------- */
export interface VelocityCell {
  i: number
  j: number
  lon: number
  lat: number
  value: number
}

/** 生成 depth 层的速度扰动网格（%） */
export function velocityGrid(depthKm: number, nx = 34, ny = 26): VelocityCell[] {
  const rnd = prng(1000 + depthKm * 7)
  const cells: VelocityCell[] = []
  const spanLon = REGION.bounds.maxLon - REGION.bounds.minLon
  const spanLat = REGION.bounds.maxLat - REGION.bounds.minLat
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const lon = REGION.bounds.minLon + (i / (nx - 1)) * spanLon
      const lat = REGION.bounds.minLat + (j / (ny - 1)) * spanLat
      // 构造若干个高速/低速异常体，随深度变化
      const d1 = Math.hypot(lon - 102.86, lat - 27.24)
      const d2 = Math.hypot(lon - 103.24, lat - 26.92)
      const d3 = Math.hypot(lon - 102.98, lat - 27.52)
      let v =
        -5.2 * Math.exp(-(d1 * d1) / (2 * 0.09 * 0.09)) +
        4.4 * Math.exp(-(d2 * d2) / (2 * 0.11 * 0.11)) +
        3.1 * Math.exp(-(d3 * d3) / (2 * 0.07 * 0.07))
      v *= 1 - Math.abs(depthKm - 8) / 26 // 异常随深度减弱
      v += gauss(rnd, 0, 0.42)
      cells.push({ i, j, lon: Number(lon.toFixed(4)), lat: Number(lat.toFixed(4)), value: Number(v.toFixed(2)) })
    }
  }
  return cells
}

export const DEPTH_SLICES = [2, 5, 8, 12, 16, 20]

/* ---------------- 棋盘格测试 ---------------- */
export function checkerboardGrid(nx = 20, ny = 16, size = 3) {
  const cells: VelocityCell[] = []
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const sign = (Math.floor(i / size) + Math.floor(j / size)) % 2 === 0 ? 1 : -1
      const lon = REGION.bounds.minLon + (i / (nx - 1)) * (REGION.bounds.maxLon - REGION.bounds.minLon)
      const lat = REGION.bounds.minLat + (j / (ny - 1)) * (REGION.bounds.maxLat - REGION.bounds.minLat)
      cells.push({ i, j, lon, lat, value: sign * 4 })
    }
  }
  return cells
}

/* ---------------- 噪声互相关 / 频散 ---------------- */
export interface StationPair {
  id: string
  a: string
  b: string
  dist: number
  snr: number
  status: '完成' | '计算中' | '排队' | '失败'
}

export const stationPairs: StationPair[] = (() => {
  const rnd = prng(60214)
  const out: StationPair[] = []
  for (let i = 0; i < 18; i++) {
    const a = stations[i % stations.length]
    const b = stations[(i * 3 + 5) % stations.length]
    const dist = Math.round(Math.hypot(a.lon - b.lon, a.lat - b.lat) * 96)
    const roll = rnd()
    out.push({
      id: 'PAIR' + String(i + 1).padStart(3, '0'),
      a: a.name,
      b: b.name,
      dist,
      snr: Number((6 + rnd() * 22).toFixed(1)),
      status: roll > 0.86 ? '失败' : roll > 0.7 ? '排队' : roll > 0.62 ? '计算中' : '完成'
    })
  }
  return out
})()

/** 频散曲线（周期 - 相速度） */
export function dispersionCurve(seed = 1) {
  const rnd = prng(seed * 977)
  const pts: Array<[number, number]> = []
  for (let t = 2; t <= 40; t += 1.2) {
    const v = 3.42 - 0.42 * Math.log(t) + gauss(rnd, 0, 0.028)
    pts.push([Number(t.toFixed(1)), Number(v.toFixed(3))])
  }
  return pts
}

/* ---------------- 任务队列 ---------------- */
export const tasks: TaskItem[] = [
  { id: 'T20260831-001', name: '体波走时层析成像', type: '体波成像', status: 'running', progress: 62, submitAt: Date.now() - 1000 * 60 * 26, cost: '约 42 min', node: 'gpu-01' },
  { id: 'T20260831-002', name: '噪声互相关计算（2026Q3）', type: '互相关', status: 'running', progress: 34, submitAt: Date.now() - 1000 * 60 * 68, cost: '约 3.5 h', node: 'cpu-03' },
  { id: 'T20260831-003', name: '震源机制解反演', type: '震源机制', status: 'queued', progress: 0, submitAt: Date.now() - 1000 * 60 * 8, cost: '约 15 min', node: '-' },
  { id: 'T20260830-014', name: '面波频散曲线提取', type: '频散提取', status: 'success', progress: 100, submitAt: Date.now() - 1000 * 60 * 60 * 20, cost: '28 min', node: 'cpu-01' },
  { id: 'T20260830-009', name: '棋盘格分辨率测试', type: '棋盘格', status: 'success', progress: 100, submitAt: Date.now() - 1000 * 60 * 60 * 26, cost: '52 min', node: 'gpu-02' },
  { id: 'T20260829-021', name: 'EGF 时间叠加', type: '叠加', status: 'failed', progress: 71, submitAt: Date.now() - 1000 * 60 * 60 * 47, cost: '-', node: 'cpu-04' },
  { id: 'T20260829-003', name: '自动频散提取（批次2）', type: '频散提取', status: 'success', progress: 100, submitAt: Date.now() - 1000 * 60 * 60 * 52, cost: '1.2 h', node: 'cpu-02' }
]

/* ---------------- 成因机理指标 ---------------- */
export const genesisIndicators = [
  { key: 'correlation', name: '水位-地震相关性', value: 0.72, threshold: 0.6, desc: '水位变化率与地震频次的相关系数' },
  { key: 'depth', name: '震源深度集中度', value: 0.81, threshold: 0.65, desc: '震源深度在水库影响范围内的集中程度' },
  { key: 'bvalue', name: 'b 值异常度', value: 0.58, threshold: 0.6, desc: '相对于构造地震背景 b 值的偏离程度' },
  { key: 'trigger', name: '触发响应延迟', value: 0.66, threshold: 0.5, desc: '水位快速变化后地震活动的滞后响应' },
  { key: 'mechanism', name: '震源机制一致性', value: 0.44, threshold: 0.55, desc: '震源机制解与区域构造应力场的一致性' }
]

/* ---------------- 统计辅助 ---------------- */
export function eventsInRange(days: number) {
  const t = Date.now() - days * 86400000
  return events.filter((e) => e.time >= t)
}

export function magDistribution(list: EqEvent[] = events) {
  const bins = [
    { name: 'M<1.0', min: 0, max: 1 },
    { name: '1.0-1.9', min: 1, max: 2 },
    { name: '2.0-2.9', min: 2, max: 3 },
    { name: '3.0-3.9', min: 3, max: 4 },
    { name: 'M≥4.0', min: 4, max: 99 }
  ]
  return bins.map((b) => ({
    name: b.name,
    value: list.filter((e) => e.mag >= b.min && e.mag < b.max).length
  }))
}

export function monthlyCount(list: EqEvent[] = events) {
  const map = new Map<string, number>()
  list.forEach((e) => {
    const d = new Date(e.time)
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    map.set(k, (map.get(k) || 0) + 1)
  })
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
}
