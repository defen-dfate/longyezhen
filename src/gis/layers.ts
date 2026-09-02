/* ============================================================
 * 图层构造辅助 —— 统一地图图层样式与数据映射
 * ============================================================ */
import type {
  HeatPoint,
  HeatLayer,
  LineLayer,
  PointFeature,
  PointLayer,
  PolygonLayer
} from '@/gis/engine'
import { events, faults, magColor, magRadius, reservoir, stations, type EqEvent } from '@/data/gis'

/** 震级图例 */
export const EVENT_LEGEND = [
  { label: 'M ≥ 3.0', color: '#e8534a', round: true },
  { label: '2.0 ≤ M < 3.0', color: '#f6a04d', round: true },
  { label: 'M < 2.0', color: '#5b8bff', round: true },
  { label: '监测台站', color: '#15a34a', round: true }
]

export function eventFeatures(list: EqEvent[] = events): PointFeature[] {
  return list.map((e) => ({
    id: e.id,
    coordinates: [e.lon, e.lat] as [number, number],
    properties: {
      id: e.id,
      name: `M${e.mag.toFixed(1)}`,
      mag: `M ${e.mag.toFixed(1)}`,
      depth: `${e.depth} km`,
      time: new Date(e.time).toLocaleString('zh-CN', { hour12: false }),
      location: e.location,
      quality: e.quality,
      _mag: e.mag,
      _pulse: false
    }
  }))
}

export function makeEventLayer(list: EqEvent[] = events, pulseLatest = true): PointLayer {
  const latestId = pulseLatest && list.length ? list[0].id : ''
  return {
    id: 'events',
    type: 'point',
    visible: true,
    zIndex: 30,
    data: eventFeatures(list),
    labelField: list.length <= 60 ? 'name' : undefined,
    style: {
      radius: (p) => magRadius((p._mag as number) ?? 1),
      fill: (p) => magColor((p._mag as number) ?? 1),
      stroke: 'rgba(255,255,255,.85)',
      lineWidth: 1,
      opacity: 0.9,
      pulse: (p) => p.id === latestId
    }
  }
}

export function makeStationLayer(): PointLayer {
  return {
    id: 'stations',
    type: 'point',
    visible: true,
    zIndex: 40,
    data: stations.map((s) => ({
      id: s.id,
      coordinates: [s.lon, s.lat] as [number, number],
      properties: {
        id: s.id,
        name: s.name,
        type: s.type,
        status: s.status,
        elevation: s.elevation,
        since: s.since
      }
    })),
    style: {
      radius: 4.5,
      fill: (p) => (p.status === '正常' ? '#15a34a' : p.status === '维护' ? '#f6a04d' : '#9aa5bd'),
      stroke: '#fff',
      lineWidth: 1.6
    }
  }
}

export function makeReservoirLayer(): PolygonLayer {
  return {
    id: 'reservoir',
    type: 'polygon',
    visible: true,
    zIndex: 10,
    data: [{ id: 'res', coordinates: reservoir, properties: { name: '水库水面' } }],
    fill: 'rgba(56,150,255,.22)',
    stroke: 'rgba(36,110,220,.75)',
    lineWidth: 1.6
  }
}

export function makeFaultLayer(): LineLayer {
  return {
    id: 'faults',
    type: 'line',
    visible: true,
    zIndex: 20,
    data: faults.map((f) => ({
      id: f.name,
      coordinates: f.coords,
      properties: { name: f.name }
    })),
    color: 'rgba(200,80,90,.6)',
    width: 2,
    dash: [7, 4]
  }
}

export function makeHeatLayer(points: HeatPoint[], max = 1, radius = 26): HeatLayer {
  return {
    id: 'heat',
    type: 'heat',
    visible: true,
    zIndex: 5,
    data: points,
    radius,
    max,
    gradient: ['#3b6ef5', '#3ec9a7', '#ffd166', '#f4741f', '#e8534a']
  }
}

/** 速度扰动配色（蓝=高速正异常? 这里约定：红=低速、蓝=高速） */
export function velocityColor(v: number): string {
  const t = Math.max(-1, Math.min(1, v / 5))
  if (t >= 0) {
    const k = Math.round(t * 255)
    return `rgb(${Math.round(255 - t * 200)},${Math.round(255 - t * 90)},${Math.round(255 - k * 0.55)})`
  }
  const k = Math.round(-t * 255)
  return `rgb(${Math.round(255 - k * 0.1)},${Math.round(255 - k * 0.55)},${Math.round(255 - k * 0.85)})`
}
