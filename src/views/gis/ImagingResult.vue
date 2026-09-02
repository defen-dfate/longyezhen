<template>
  <div class="grid" style="gap: 14px">
    <!-- 参数 -->
    <section class="card">
      <div class="card-bd">
        <div class="row wrap" style="gap: 18px">
          <div>
            <label class="lbl">深度层 (km)</label>
            <select v-model.number="depth" class="select" style="width: 110px">
              <option v-for="d in DEPTH_SLICES" :key="d" :value="d">{{ d }} km</option>
            </select>
          </div>
          <div>
            <label class="lbl">显示方式</label>
            <div class="seg">
              <button :class="{ on: viewMode === 'heat' }" @click="viewMode = 'heat'">切片热力图</button>
              <button :class="{ on: viewMode === 'map' }" @click="viewMode = 'map'">空间分布图</button>
            </div>
          </div>
          <div class="grow"></div>
          <div class="center">
            <div class="dim small">最大低速异常</div>
            <strong style="font-size: 18px; color: var(--danger)">{{ maxLow.toFixed(2) }}%</strong>
          </div>
          <div class="center">
            <div class="dim small">最大高速异常</div>
            <strong style="font-size: 18px; color: var(--primary)">{{ maxHigh.toFixed(2) }}%</strong>
          </div>
        </div>
      </div>
    </section>

    <!-- 切片热力图 -->
    <section v-show="viewMode === 'heat'" class="card">
      <div class="card-hd">
        <h3>速度扰动切片（{{ depth }} km）</h3>
        <span class="sub">红 = 低速异常 · 蓝 = 高速异常</span>
      </div>
      <div class="card-bd"><div ref="heatEl" class="heat-chart"></div></div>
    </section>

    <!-- 空间分布图 -->
    <section v-show="viewMode === 'map'" class="card">
      <div class="card-hd">
        <h3>速度扰动空间分布（{{ depth }} km）</h3>
        <span class="sub">研究区网格节点叠加显示</span>
      </div>
      <div class="card-bd flush">
        <GisMap :layers="mapLayers" :center="REGION.center" :zoom="REGION.zoom" :height="440" :legend="legend" :tianditu-key="mapKey" :basemap="app.prefBasemap" />
      </div>
    </section>

    <!-- 统计 + 解释 -->
    <div class="grid grid-3">
      <section class="card">
        <div class="card-hd"><h3>异常统计</h3></div>
        <div class="card-bd">
          <div class="kv"><span>节点总数</span><strong class="mono">{{ cells.length }}</strong></div>
          <div class="kv"><span>低速节点占比</span><strong class="mono">{{ lowRatio }}%</strong></div>
          <div class="kv"><span>高速节点占比</span><strong class="mono">{{ highRatio }}%</strong></div>
          <div class="kv"><span>平均速度扰动</span><strong class="mono">{{ meanV.toFixed(2) }}%</strong></div>
          <div class="kv"><span>扰动标准差</span><strong class="mono">{{ stdV.toFixed(2) }}%</strong></div>
        </div>
      </section>
      <section class="card" style="grid-column: span 2">
        <div class="card-hd"><h3>地质解释</h3></div>
        <div class="card-bd">
          <p class="note">{{ interpretation }}</p>
          <div class="row wrap" style="gap: 8px; margin-top: 10px">
            <span v-for="b in blobs" :key="b.name" class="tag" :class="b.tone">
              <i class="dot" :style="{ background: b.color }"></i>{{ b.name }}
            </span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import GisMap from '@/components/gis/GisMap.vue'
import { useChart, type EChartsOption } from '@/composables/useChart'
import { DEPTH_SLICES, REGION, velocityGrid, type VelocityCell } from '@/data/gis'
import { velocityColor } from '@/gis/layers'
import type { Layer, PointLayer, PointFeature } from '@/gis/engine'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const depth = ref(8)
const viewMode = ref<'heat' | 'map'>('heat')
const mapKey = import.meta.env.VITE_TIANDITU_KEY || ''

const cells = computed<VelocityCell[]>(() => velocityGrid(depth.value))

const values = computed(() => cells.value.map((c) => c.value))
const maxLow = computed(() => Math.min(0, ...values.value))
const maxHigh = computed(() => Math.max(0, ...values.value))
const meanV = computed(() => values.value.reduce((s, v) => s + v, 0) / values.value.length)
const stdV = computed(() => {
  const m = meanV.value
  return Math.sqrt(values.value.reduce((s, v) => s + (v - m) ** 2, 0) / values.value.length)
})
const lowRatio = computed(() => ((values.value.filter((v) => v < -0.5).length / values.value.length) * 100).toFixed(0))
const highRatio = computed(() => ((values.value.filter((v) => v > 0.5).length / values.value.length) * 100).toFixed(0))

/** 速度配色色带（用于 ECharts visualMap） */
function velocityRamp(): string[] {
  const out: string[] = []
  for (let i = 0; i <= 10; i++) {
    out.push(velocityColor(-5 + (i / 10) * 10))
  }
  return out
}

const interpretation = computed(() => {
  const low = maxLow.value <= -3
  const high = maxHigh.value >= 3
  if (low && high)
    return `在 ${depth.value} km 深度，成像结果显示研究区存在显著的速度横向非均质性：西南部沿江一带呈现明显低速异常，符合库水载荷与孔隙压力扩散引起的介质松弛特征；东部深部见高速异常，可能与基底隆起或完整基岩相关。该切片结果与水文诱发地震的活动性空间分布基本一致。`
  if (low)
    return `在 ${depth.value} km 深度，研究区以低速异常为主，介质整体偏破碎，利于流体运移与应力调整，是水库地震易发的物性背景。`
  if (high)
    return `在 ${depth.value} km 深度，研究区以高速异常为主，介质相对完整坚硬，应力更易局部积累。`
  return `在 ${depth.value} km 深度，速度扰动幅度较小，未显示显著的低速或高速异常体，介质相对均匀。`
})

const blobs = computed(() => [
  { name: '沿江低速带', tone: 'danger', color: '#e8534a' },
  { name: '东部高速体', tone: 'primary', color: '#345ce0' },
  { name: '均匀背景', tone: '', color: '#cfd6e6' }
])

const legend = [
  { label: '低速异常 (< -0.5%)', color: '#e8534a', round: true },
  { label: '高速异常 (> 0.5%)', color: '#345ce0', round: true },
  { label: '近均匀', color: '#cfd6e6', round: true }
]

/* ---------------- 地图图层 ---------------- */
const mapLayers = computed<Layer[]>(() => {
  const pts: PointFeature[] = cells.value.map((c) => ({
    id: `v-${c.i}-${c.j}`,
    coordinates: [c.lon, c.lat],
    properties: { value: c.value.toFixed(2) + '%', lon: c.lon, lat: c.lat }
  }))
  const layer: PointLayer = {
    id: 'velocity',
    type: 'point',
    visible: true,
    zIndex: 30,
    data: pts,
    style: {
      radius: 6,
      fill: (p) => velocityColor(Number(String(p.value).replace('%', '')) || 0),
      stroke: 'rgba(255,255,255,.6)',
      lineWidth: 0.6,
      opacity: 0.92
    }
  }
  return [layer]
})

/* ---------------- 图表 ---------------- */
const heatEl = ref<HTMLElement | null>(null)

const heatOption = (): EChartsOption => {
  const NX = cells.value.reduce((m, c) => Math.max(m, c.i), 0) + 1
  const NY = cells.value.reduce((m, c) => Math.max(m, c.j), 0) + 1
  return {
    tooltip: {
      formatter: (p: unknown) => {
        const d = (p as { value: [number, number, number] }).value
        return `节点 i=${d[0]}, j=${d[1]}<br/>速度扰动 ${d[2].toFixed(2)}%`
      }
    },
    grid: { left: 8, right: 8, top: 8, bottom: 30, containLabel: true },
    xAxis: {
      type: 'category',
      data: Array.from({ length: NX }, (_, i) => String(i)),
      axisLabel: { fontSize: 9, color: '#7a8299', interval: 4 },
      axisTick: { show: false },
      splitArea: { show: false }
    },
    yAxis: {
      type: 'category',
      data: Array.from({ length: NY }, (_, j) => String(j)),
      axisLabel: { fontSize: 9, color: '#7a8299', interval: 3 },
      axisTick: { show: false },
      splitArea: { show: false }
    },
    visualMap: {
      min: -5,
      max: 5,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      itemWidth: 11,
      itemHeight: 110,
      textStyle: { fontSize: 10, color: '#7a8299' },
      inRange: { color: velocityRamp() }
    },
    series: [
      {
        type: 'heatmap',
        data: cells.value.map((c) => [c.i, c.j, c.value]),
        progressive: 0,
        itemStyle: { borderWidth: 0 },
        emphasis: { itemStyle: { borderColor: '#333', borderWidth: 1 } }
      }
    ]
  }
}

useChart(heatEl, heatOption, [cells, viewMode])
</script>

<style scoped>
.lbl { display: block; margin-bottom: 5px; font-size: 12px; color: var(--text-2); }
.heat-chart { height: 360px; width: 100%; }

.kv {
  display: flex; justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 13px;
}
.kv span { color: var(--text-2); }

.note {
  padding: 11px 13px;
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  font-size: 12px;
  line-height: 1.85;
  color: var(--text-2);
}
.dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 2px; }

@media (max-width: 1100px) {
  .grid-3 { grid-template-columns: 1fr; }
}
</style>
