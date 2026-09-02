<template>
  <div class="gis-map" :class="{ 'amap-on': current === 'amap' }" :style="{ height: height + 'px' }">
    <div ref="amapEl" class="amap-host" :class="{ on: current === 'amap' }"></div>
    <canvas ref="canvasEl"></canvas>

    <!-- 缩放控件 -->
    <div class="ctrls">
      <button title="放大" @click="zoomBy(1)">+</button>
      <button title="缩小" @click="zoomBy(-1)">−</button>
      <button title="复位" @click="reset">
        <AppIcon name="refresh" :size="13" />
      </button>
    </div>

    <!-- 底图切换 -->
    <div class="basemap">
      <button
        v-for="b in basemapOptions"
        :key="b.key"
        :class="{ on: current === b.key }"
        :disabled="b.needKey && !hasKey"
        :title="b.needKey && !hasKey ? '需要配置天地图 key' : b.name"
        @click="setBasemap(b.key)"
      >
        {{ b.name }}
      </button>
    </div>

    <!-- 图例 -->
    <div v-if="legend.length" class="legend">
      <div v-for="l in legend" :key="l.label" class="lg">
        <i :style="{ background: l.color, borderRadius: l.round ? '50%' : '2px' }"></i>
        <span>{{ l.label }}</span>
      </div>
    </div>

    <!-- 高德加载提示 -->
    <div v-if="loadingAmap" class="amap-loading">高德地图加载中…</div>

    <!-- 状态栏 -->
    <div class="status mono">
      中心 {{ center[0].toFixed(3) }}, {{ center[1].toFixed(3) }} · 层级 {{ zoom.toFixed(1) }}
      <span v-if="!hasKey && current !== 'grid'" class="dim">（未配置 key，使用网格底图）</span>
    </div>

    <!-- 悬浮提示 -->
    <div v-if="tip" class="tip" :style="{ left: tipPos[0] + 12 + 'px', top: tipPos[1] + 12 + 'px' }">
      <div v-for="(v, k) in tip" :key="String(k)" class="tip-row">
        <span class="dim">{{ k }}</span>
        <strong>{{ v }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { GisEngine, type BasemapType, type Layer, type ScreenXY } from '@/gis/engine'
import type { LonLat } from '@/gis/engine'
import { loadAMap, wgs2gcj, gcj2wgs } from '@/gis/amap'

const props = withDefaults(
  defineProps<{
    layers: Layer[]
    center?: LonLat
    zoom?: number
    height?: number
    legend?: Array<{ label: string; color: string; round?: boolean }>
    tiandituKey?: string
    basemap?: BasemapType
  }>(),
  { height: 420, legend: () => [], basemap: 'amap' }
)

const emit = defineEmits<{
  ready: [engine: GisEngine]
  click: [props: Record<string, unknown> | null]
}>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const amapEl = ref<HTMLElement | null>(null)
const current = ref<BasemapType>(props.basemap || 'amap')
const hasKey = ref(!!props.tiandituKey)
const center = ref<LonLat>(props.center ? [...props.center] as LonLat : [102.92, 27.18])
const zoom = ref(props.zoom ?? 8)
const tip = ref<Record<string, string> | null>(null)
const tipPos = ref<[number, number]>([0, 0])
const loadingAmap = ref(false)

let engine: GisEngine | null = null
let amapMap: any = null
let ro: ResizeObserver | null = null

const basemapOptions = [
  { key: 'amap' as BasemapType, name: '高德', needKey: false },
  { key: 'grid' as BasemapType, name: '网格', needKey: false },
  { key: 'vec' as BasemapType, name: '矢量', needKey: true },
  { key: 'img' as BasemapType, name: '影像', needKey: true },
  { key: 'ter' as BasemapType, name: '地形', needKey: true }
]

onMounted(() => {
  if (!canvasEl.value) return
  engine = new GisEngine(canvasEl.value, {
    center: props.center,
    zoom: props.zoom,
    basemap: 'grid',
    tiandituKey: props.tiandituKey
  })
  engine.setLayers(props.layers)
  engine.onMove = (c, z) => {
    center.value = [Number(c[0].toFixed(4)), Number(c[1].toFixed(4))]
    zoom.value = Number(z.toFixed(2))
  }
  engine.onHover = (p, xy) => {
    tip.value = p ? toTip(p) : null
    tipPos.value = xy
  }
  engine.onClick = (p) => emit('click', p)
  emit('ready', engine)

  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(() => engine?.resize())
    ro.observe(canvasEl.value.parentElement!)
  }

  if (current.value === 'amap') ensureAmap()
})

onBeforeUnmount(() => {
  ro?.disconnect()
  if (amapMap) {
    try { amapMap.destroy() } catch { /* noop */ }
    amapMap = null
  }
  engine?.destroy()
  engine = null
})

watch(
  () => props.layers,
  (l) => engine?.setLayers(l),
  { deep: false }
)

watch(
  () => [props.center, props.zoom],
  () => {
    if (props.center && engine) {
      engine.setView(props.center, props.zoom)
      center.value = [...props.center] as LonLat
      zoom.value = props.zoom ?? zoom.value
    }
  }
)

watch(
  () => props.basemap,
  (b) => {
    if (b) setBasemap(b)
  }
)

function toTip(p: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  Object.entries(p).forEach(([k, v]) => {
    if (['lon', 'lat', 'lng'].includes(k)) return
    out[TIP_LABELS[k] || k] = String(v)
  })
  return out
}

const TIP_LABELS: Record<string, string> = {
  name: '名称',
  id: '编号',
  mag: '震级',
  depth: '深度(km)',
  time: '发震时刻',
  location: '参考位置',
  type: '类型',
  status: '状态',
  elevation: '高程(m)',
  quality: '定位质量',
  value: '数值',
  dist: '台间距(km)',
  snr: '信噪比'
}

function zoomBy(d: number) {
  if (!engine) return
  engine.setView(engine.center, engine.zoom + d)
  center.value = [...engine.center] as LonLat
  zoom.value = Number(engine.zoom.toFixed(2))
}

function reset() {
  if (!engine) return
  engine.flyTo(props.center || ([102.92, 27.18] as LonLat), props.zoom ?? 8, 600)
}

function setBasemap(t: BasemapType) {
  if (t === 'amap') {
    current.value = 'amap'
    ensureAmap()
    return
  }
  current.value = t
  // 切离高德：销毁地图实例，恢复自绘底图
  if (amapMap) {
    try { amapMap.destroy() } catch { /* noop */ }
    amapMap = null
  }
  engine?.clearAMap()
  engine?.setBasemap(t)
}

/** 懒加载并初始化高德地图，叠加层由引擎对齐投影绘制 */
async function ensureAmap() {
  if (amapMap || !amapEl.value) return
  loadingAmap.value = true
  try {
    const AMap = await loadAMap()
    if (!amapEl.value) return
    const seed = props.center || ([102.92, 27.18] as LonLat)
    const [glon, glat] = wgs2gcj(seed[0], seed[1])
    const map = new AMap.Map(amapEl.value, {
      zoom: props.zoom ?? 8,
      center: [glon, glat],
      viewMode: '2D',
      mapStyle: 'amap://styles/normal'
    })
    amapMap = map
    map.on('mapmove', syncFromAmap)
    map.on('zoomchange', syncFromAmap)
    map.on('complete', syncFromAmap)
    map.on('resize', () => engine?.invalidate())
    // amap 模式下画布不接收鼠标事件，这里把高德的事件转回叠加层拾取
    map.on('mousemove', (e: any) => {
      const xy: ScreenXY = [e.pixel.x, e.pixel.y]
      const p = engine?.pickAt(xy) || null
      tip.value = p ? toTip(p) : null
      tipPos.value = xy
    })
    map.on('mouseout', () => (tip.value = null))
    map.on('click', (e: any) => {
      emit('click', engine?.pickAt([e.pixel.x, e.pixel.y]) || null)
    })
    engine?.setAMap(map, AMap)
    syncFromAmap()
  } catch {
    // 加载失败：回退到网格底图
    current.value = 'grid'
    engine?.setBasemap('grid')
  } finally {
    loadingAmap.value = false
  }
}

/** 高德视图变化后，同步回引擎（WGS-84）用于状态栏与控制 */
function syncFromAmap() {
  if (!amapMap || !engine) return
  const c = amapMap.getCenter()
  const [wlon, wlat] = gcj2wgs(c.getLng(), c.getLat())
  engine.center = [wlon, wlat] as LonLat
  engine.zoom = amapMap.getZoom()
  engine.invalidate()
}
</script>

<style scoped>
.gis-map {
  position: relative;
  width: 100%;
  border-radius: var(--radius);
  overflow: hidden;
  background: #eaeef5;
  border: 1px solid var(--border);
}
canvas { display: block; position: relative; z-index: 1; }

/* 高德底图宿主层（位于画布之下） */
.amap-host {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: none;
}
.amap-host.on { display: block; }
/* amap 模式下画布仅作透明叠加层，交互交给高德 */
.gis-map.amap-on canvas { pointer-events: none; }

.amap-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  background: rgba(24, 31, 46, .88);
  color: #fff;
  font-size: 12px;
  box-shadow: var(--shadow);
}

.ctrls {
  position: absolute;
  right: 10px;
  top: 10px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 1px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow: var(--shadow);
  background: var(--border-soft);
}
.ctrls button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: var(--bg-elev);
  color: var(--text-2);
  font-size: 16px;
  cursor: pointer;
  font-family: inherit;
}
.ctrls button:hover { color: var(--primary); background: var(--primary-soft); }

.basemap {
  position: absolute;
  left: 10px;
  top: 10px;
  z-index: 3;
  display: flex;
  gap: 1px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow: var(--shadow);
  background: var(--border-soft);
}
.basemap button {
  padding: 5px 10px;
  border: none;
  background: var(--bg-elev);
  color: var(--text-2);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.basemap button:hover:not(:disabled) { color: var(--primary); }
.basemap button.on { background: var(--primary); color: #fff; }
.basemap button:disabled { opacity: .45; cursor: not-allowed; }

.legend {
  position: absolute;
  left: 10px;
  bottom: 32px;
  z-index: 3;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, .92);
  box-shadow: var(--shadow);
  backdrop-filter: blur(4px);
  display: grid;
  gap: 5px;
}
[data-theme="dark"] .legend { background: rgba(22, 29, 44, .92); }
.lg { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--text-2); }
.lg i { width: 10px; height: 10px; flex: 0 0 auto; }

.status {
  position: absolute;
  left: 10px;
  bottom: 8px;
  z-index: 3;
  font-size: 11px;
  color: var(--text-2);
  text-shadow: 0 1px 2px rgba(255, 255, 255, .8);
}
[data-theme="dark"] .status { text-shadow: 0 1px 2px rgba(0, 0, 0, .6); }

.tip {
  position: absolute;
  z-index: 5;
  min-width: 130px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: rgba(24, 31, 46, .94);
  color: #fff;
  box-shadow: var(--shadow-lg);
  pointer-events: none;
  font-size: 12px;
}
.tip-row { display: flex; justify-content: space-between; gap: 14px; line-height: 1.7; }
.tip-row .dim { color: rgba(255, 255, 255, .6); }
</style>
